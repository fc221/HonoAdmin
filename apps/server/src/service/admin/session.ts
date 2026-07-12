import type { ServiceRequestContext } from '../types'
import type { UserCredential } from './system/user'
import { buildCacheKey } from '@hono-admin/cache'
import { constantTimeEqual, toHex } from '@hono-admin/utils/crypto'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { getAdminLayoutCacheVersion } from './layout-cache'
import {
  getUserCredentialById,
  listUserSessionRoles,
} from './system/user'

interface SessionUserCacheEntry {
  roles: Array<{ code: string, id: number }>
  user: UserCredential
}

const adminSessionCookieName = 'hono_admin_session'
const adminSessionRoleModeCookieName = 'hono_admin_role_mode'
const adminSessionActiveRoleCookieName = 'hono_admin_active_role_id'
const adminSessionMaxAgeSeconds = 60 * 60 * 24 * 7
const adminSessionCookiePath = '/'
const sessionUserCacheTtlSeconds = 60
const sessionUserRequestCache = new WeakMap<
  ServiceRequestContext,
  Promise<UserCredential | null>
>()

export async function setAdminSession(
  c: ServiceRequestContext,
  user: UserCredential,
  remember: boolean,
): Promise<void> {
  const issuedAt = Date.now().toString()
  const value = await signAdminSession(c, user, issuedAt)

  setCookie(c, adminSessionCookieName, value, {
    httpOnly: true,
    maxAge: remember ? adminSessionMaxAgeSeconds : undefined,
    path: adminSessionCookiePath,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
  })
  sessionUserRequestCache.delete(c)
  clearSessionActiveRole(c)
}

export function setSessionActiveRole(
  c: ServiceRequestContext,
  roleId: number,
): void {
  setCookie(c, adminSessionActiveRoleCookieName, String(roleId), {
    httpOnly: true,
    maxAge: adminSessionMaxAgeSeconds,
    path: adminSessionCookiePath,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
  })
  sessionUserRequestCache.delete(c)
}

export function clearSessionActiveRole(c: ServiceRequestContext): void {
  deleteCookie(c, adminSessionActiveRoleCookieName, {
    path: adminSessionCookiePath,
  })
  sessionUserRequestCache.delete(c)
}

export async function getSessionActiveRoleId(
  c: ServiceRequestContext,
  user: UserCredential,
): Promise<number | null> {
  const roles = await listUserSessionRoles(c, user.id)
  const roleIds = roles.map((role) => role.id)
  const cookieRoleId = Number(getCookie(c, adminSessionActiveRoleCookieName))

  if (Number.isInteger(cookieRoleId) && roleIds.includes(cookieRoleId)) {
    return cookieRoleId
  }

  const legacyRoleMode = getCookie(c, adminSessionRoleModeCookieName)
  if (legacyRoleMode === 'admin' || legacyRoleMode === 'user') {
    const legacyRole = roles.find((role) => role.code === legacyRoleMode)
    if (legacyRole) {
      return legacyRole.id
    }
  }

  return user.roleId && roleIds.includes(user.roleId)
    ? user.roleId
    : roleIds[0] ?? null
}

export async function verifyAdminSession(
  c: ServiceRequestContext,
): Promise<boolean> {
  return !!await getAdminSessionUser(c)
}

export async function getAdminSessionUser(
  c: ServiceRequestContext,
): Promise<UserCredential | null> {
  const cached = sessionUserRequestCache.get(c)
  if (cached) {
    return cached
  }

  const promise = loadAdminSessionUser(c)
  sessionUserRequestCache.set(c, promise)
  return promise
}

async function loadAdminSessionUser(
  c: ServiceRequestContext,
): Promise<UserCredential | null> {
  const session = getCookie(c, adminSessionCookieName)

  if (!session) {
    return null
  }

  const [userId, issuedAt, signature] = session.split('.')
  if (!userId || !issuedAt || !signature) {
    return null
  }

  // 这几项零成本,放在查库前面:伪造 cookie 打不出数据库查询。
  const id = Number(userId)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  const issuedAtMs = Number(issuedAt)
  if (!Number.isFinite(issuedAtMs)) {
    return null
  }

  if (Date.now() - issuedAtMs > adminSessionMaxAgeSeconds * 1000) {
    return null
  }

  const entry = await loadSessionUserEntry(c, session, id, issuedAt, signature)
  if (!entry) {
    return null
  }

  return withSessionActiveRole(c, entry.user, entry.roles)
}

/**
 * 每个受保护请求原本都要查两次库(用户凭证 + 用户角色)。这里按「cookie 哈希 + 布局缓存版本号」
 * 缓存已验签的结果:只有出示了完整有效 cookie 的人才够得到该条目,任何用户/角色/密码变更都会
 * bump 版本号从而立刻失效。缓存值不含密码哈希——命中时无需再验签,自然也不需要签名密钥。
 */
async function loadSessionUserEntry(
  c: ServiceRequestContext,
  session: string,
  id: number,
  issuedAt: string,
  signature: string,
): Promise<SessionUserCacheEntry | null> {
  const cacheKey = await getSessionUserCacheKey(c, session)
  const cached = await c.cache.get<SessionUserCacheEntry>(cacheKey).catch(() => null)
  if (cached?.user) {
    return cached
  }

  const user = await getUserCredentialById(c, id)
  if (!user) {
    return null
  }

  const expectedSession = await signAdminSession(c, user, issuedAt)
  const expectedSignature = expectedSession.split('.')[2]
  if (!constantTimeEqual(signature, expectedSignature ?? '')) {
    return null
  }

  const entry: SessionUserCacheEntry = {
    roles: await listUserSessionRoles(c, user.id),
    user: { ...user, password: '' },
  }
  await c.cache
    .set(cacheKey, entry, { ttlSeconds: sessionUserCacheTtlSeconds })
    .catch(() => {})

  return entry
}

async function getSessionUserCacheKey(
  c: ServiceRequestContext,
  session: string,
): Promise<string> {
  const version = await getAdminLayoutCacheVersion(c)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(session),
  )

  return buildCacheKey('session', 'user', version, toHex(new Uint8Array(digest)))
}

export function clearAdminSession(c: ServiceRequestContext): void {
  deleteCookie(c, adminSessionCookieName, {
    path: adminSessionCookiePath,
  })
  deleteCookie(c, adminSessionRoleModeCookieName, {
    path: adminSessionCookiePath,
  })
  clearSessionActiveRole(c)
  sessionUserRequestCache.delete(c)
}

async function signAdminSession(
  c: ServiceRequestContext,
  user: UserCredential,
  issuedAt: string,
): Promise<string> {
  const sessionSecret = c.config.sessionSecret?.trim()
  const secret = sessionSecret || user.password
  const payload = sessionSecret
    ? `admin:${user.id}:${issuedAt}:${user.password}`
    : `admin:${user.id}:${issuedAt}`
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
    new TextEncoder().encode(payload),
  )

  return `${user.id}.${issuedAt}.${toHex(new Uint8Array(signature))}`
}

function withSessionActiveRole(
  c: ServiceRequestContext,
  user: UserCredential,
  roles: Array<{ code: string, id: number }>,
): UserCredential {
  const activeRoleId = resolveSessionActiveRoleId(c, user, roles)
  const activeRole = roles.find((role) => role.id === activeRoleId)

  return {
    ...user,
    activeRoleId,
    roleCode: activeRole?.code ?? user.roleCode,
    roleId: activeRoleId,
    roleIds: roles.map((role) => role.id),
  }
}

function resolveSessionActiveRoleId(
  c: ServiceRequestContext,
  user: UserCredential,
  roles: Array<{ code: string, id: number }>,
): number | null {
  const roleIds = roles.map((role) => role.id)
  const cookieRoleId = Number(getCookie(c, adminSessionActiveRoleCookieName))

  if (Number.isInteger(cookieRoleId) && roleIds.includes(cookieRoleId)) {
    return cookieRoleId
  }

  const legacyRoleMode = getCookie(c, adminSessionRoleModeCookieName)
  if (legacyRoleMode === 'admin' || legacyRoleMode === 'user') {
    const legacyRole = roles.find((role) => role.code === legacyRoleMode)
    if (legacyRole) {
      return legacyRole.id
    }
  }

  return user.roleId && roleIds.includes(user.roleId)
    ? user.roleId
    : roleIds[0] ?? null
}
