import type { ServiceRequestContext } from '../types'
import type { UserCredential } from './system/user'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { getUserCredentialById } from './system/user'

const adminSessionCookieName = 'hono_admin_session'
const adminSessionMaxAgeSeconds = 60 * 60 * 24 * 7
const adminSessionCookiePath = '/'

export async function setAdminSession(
  c: ServiceRequestContext,
  user: UserCredential,
  remember: boolean,
): Promise<void> {
  const issuedAt = Date.now().toString()
  const value = await signAdminSession(user, issuedAt)

  setCookie(c, adminSessionCookieName, value, {
    httpOnly: true,
    maxAge: remember ? adminSessionMaxAgeSeconds : undefined,
    path: adminSessionCookiePath,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
  })
}

export async function verifyAdminSession(
  c: ServiceRequestContext,
): Promise<boolean> {
  return !!await getAdminSessionUser(c)
}

export async function getAdminSessionUser(
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

  const user = await getUserCredentialById(c, Number(userId))
  if (!user) {
    return null
  }

  const issuedAtMs = Number(issuedAt)
  if (!Number.isFinite(issuedAtMs)) {
    return null
  }

  if (Date.now() - issuedAtMs > adminSessionMaxAgeSeconds * 1000) {
    return null
  }

  const expectedSession = await signAdminSession(user, issuedAt)
  const expectedSignature = expectedSession.split('.')[2]
  return constantTimeEqual(signature, expectedSignature ?? '') ? user : null
}

export function clearAdminSession(c: ServiceRequestContext): void {
  deleteCookie(c, adminSessionCookieName, {
    path: adminSessionCookiePath,
  })
}

async function signAdminSession(
  user: UserCredential,
  issuedAt: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(user.password),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`admin:${user.id}:${issuedAt}`),
  )

  return `${user.id}.${issuedAt}.${toHex(new Uint8Array(signature))}`
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }

  return diff === 0
}

function toHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
