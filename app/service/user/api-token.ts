import type { UserCredential } from '../admin/system/user'
import type { ServiceRequestContext } from '../types'
import type { UserLoginInput } from './login'
import { buildCacheKey } from '../../infra/cache/types'
import { constantTimeEqual, toHex } from '../../utils/crypto'
import {
  ConfigurationError,
  UnauthorizedError,
} from '../../utils/errors'
import { createRequestOperateLog } from '../admin/system/operate-log'
import {
  getUserById,
  getUserCredentialById,
  getUserCredentialByUsername,
  needsPasswordRehash,
  updateUser,
  verifyUserPassword,
} from '../admin/system/user'
import { userLoginSchema } from './login'

const userApiTokenTtlSeconds = 60 * 60 * 24 * 7
const userApiTokenType = 'user-api-access'

interface UserApiTokenPayload {
  exp: number
  iat: number
  jti: string
  sub: string
  typ: typeof userApiTokenType
  ver: string
}

export interface UserApiLoginResult {
  accessToken: string
  expiresAt: number
  tokenType: 'Bearer'
  user: Awaited<ReturnType<typeof getUserById>>
}

export interface VerifiedUserApiToken {
  expiresAt: number
  tokenId: string
  user: UserCredential
}

export async function loginUserWithApiToken(
  c: ServiceRequestContext,
  input: UserLoginInput,
): Promise<UserApiLoginResult | null> {
  const loginInput = userLoginSchema.parse(input)
  const user = await getUserCredentialByUsername(c, loginInput.username)

  if (!user || !(await verifyUserPassword(loginInput.password, user.password))) {
    return null
  }

  const credential = await updatePasswordHashIfNeeded(
    c,
    user,
    loginInput.password,
  )
  const token = await createUserApiToken(c, credential)
  await createRequestOperateLog(c, {
    logMsg: `用户 API 登录 ${credential.username}`,
    logType: 'login',
    method: 'user.api.login',
    userId: credential.id,
  })

  return {
    accessToken: token.accessToken,
    expiresAt: token.expiresAt,
    tokenType: 'Bearer',
    user: await getUserById(c, credential.id),
  }
}

export async function verifyUserApiToken(
  c: ServiceRequestContext,
  token: string,
): Promise<VerifiedUserApiToken> {
  const payload = await verifyAndParseUserApiToken(c, token)
  const userId = Number(payload.sub)

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new UnauthorizedError('API 访问令牌无效。')
  }

  if (await isUserApiTokenRevoked(c, payload.jti)) {
    throw new UnauthorizedError('API 访问令牌已失效。')
  }

  const user = await getUserCredentialById(c, userId)
  if (!user || !constantTimeEqual(payload.ver, await getTokenVersion(user))) {
    throw new UnauthorizedError('API 访问令牌无效。')
  }

  return {
    expiresAt: payload.exp * 1000,
    tokenId: payload.jti,
    user,
  }
}

export async function logoutUserWithApiToken(
  c: ServiceRequestContext,
  verifiedToken: VerifiedUserApiToken,
): Promise<void> {
  await revokeUserApiToken(c, verifiedToken)
  await createRequestOperateLog(c, {
    logMsg: `用户 API 退出 ${verifiedToken.user.username}`,
    logType: 'logout',
    method: 'user.api.logout',
    userId: verifiedToken.user.id,
  })
}

async function createUserApiToken(
  c: ServiceRequestContext,
  user: UserCredential,
) {
  const issuedAt = Math.floor(c.now() / 1000)
  const expiresAt = issuedAt + userApiTokenTtlSeconds
  const payload: UserApiTokenPayload = {
    exp: expiresAt,
    iat: issuedAt,
    jti: crypto.randomUUID(),
    sub: String(user.id),
    typ: userApiTokenType,
    ver: await getTokenVersion(user),
  }
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  const signingInput = [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
  ].join('.')
  const signature = await signJwtInput(c, signingInput)

  return {
    accessToken: `${signingInput}.${signature}`,
    expiresAt: expiresAt * 1000,
  }
}

async function verifyAndParseUserApiToken(
  c: ServiceRequestContext,
  token: string,
): Promise<UserApiTokenPayload> {
  const segments = token.split('.')
  if (segments.length !== 3) {
    throw new UnauthorizedError('API 访问令牌无效。')
  }

  const [encodedHeader, encodedPayload, signature] = segments
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new UnauthorizedError('API 访问令牌无效。')
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = await signJwtInput(c, signingInput)
  if (!constantTimeEqual(signature, expectedSignature)) {
    throw new UnauthorizedError('API 访问令牌无效。')
  }

  const payload = parseTokenPayload(encodedPayload)
  const now = Math.floor(c.now() / 1000)
  if (payload.typ !== userApiTokenType || payload.exp <= now) {
    throw new UnauthorizedError('API 访问令牌已失效。')
  }

  return payload
}

function parseTokenPayload(encodedPayload: string): UserApiTokenPayload {
  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<UserApiTokenPayload>
    if (
      typeof payload.exp === 'number'
      && typeof payload.iat === 'number'
      && typeof payload.jti === 'string'
      && typeof payload.sub === 'string'
      && payload.typ === userApiTokenType
      && typeof payload.ver === 'string'
    ) {
      return payload as UserApiTokenPayload
    }
  } catch {
    // Fall through to the uniform unauthorized error below.
  }

  throw new UnauthorizedError('API 访问令牌无效。')
}

async function revokeUserApiToken(
  c: ServiceRequestContext,
  token: VerifiedUserApiToken,
): Promise<void> {
  const ttlSeconds = Math.max(
    1,
    Math.ceil((token.expiresAt - c.now()) / 1000),
  )
  await c.cache.set(getRevokedTokenCacheKey(token.tokenId), true, {
    ttlSeconds,
  })
}

async function isUserApiTokenRevoked(
  c: ServiceRequestContext,
  tokenId: string,
): Promise<boolean> {
  return c.cache.has(getRevokedTokenCacheKey(tokenId))
}

function getRevokedTokenCacheKey(tokenId: string): string {
  return buildCacheKey('security', 'api-token', 'revoked', tokenId)
}

async function updatePasswordHashIfNeeded(
  c: ServiceRequestContext,
  user: NonNullable<Awaited<ReturnType<typeof getUserCredentialByUsername>>>,
  password: string,
) {
  if (!needsPasswordRehash(user.password)) {
    return user
  }

  await updateUser(c, user.id, { password })
  return await getUserCredentialById(c, user.id) ?? user
}

async function getTokenVersion(user: UserCredential): Promise<string> {
  return toHex(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${user.id}:${user.password}`),
      ),
    ),
  )
}

async function signJwtInput(
  c: ServiceRequestContext,
  signingInput: string,
): Promise<string> {
  const secret = c.config.jwtSecret?.trim()
  if (!secret) {
    throw new ConfigurationError('JWT Secret 未配置。')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  )

  return encodeBase64UrlBytes(new Uint8Array(signature))
}

function encodeBase64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function encodeBase64UrlBytes(bytes: Uint8Array): string {
  let value = ''
  for (const byte of bytes) {
    value += String.fromCharCode(byte)
  }
  return encodeBase64Url(value)
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
}
