import type { ServiceRequestContext } from '../types'
import type { UserCredential } from './system/user'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
  getUserCredentialById,
  listUserSessionRoles,
} from './system/user'

const adminSessionCookieName = 'hono_admin_session'
const adminSessionRoleModeCookieName = 'hono_admin_role_mode'
const adminSessionActiveRoleCookieName = 'hono_admin_active_role_id'
const adminSessionMaxAgeSeconds = 60 * 60 * 24 * 7
const adminSessionCookiePath = '/'

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
}

export function clearSessionActiveRole(c: ServiceRequestContext): void {
  deleteCookie(c, adminSessionActiveRoleCookieName, {
    path: adminSessionCookiePath,
  })
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

  const expectedSession = await signAdminSession(c, user, issuedAt)
  const expectedSignature = expectedSession.split('.')[2]
  if (!constantTimeEqual(signature, expectedSignature ?? '')) {
    return null
  }

  return withSessionActiveRole(c, user)
}

export function clearAdminSession(c: ServiceRequestContext): void {
  deleteCookie(c, adminSessionCookieName, {
    path: adminSessionCookiePath,
  })
  deleteCookie(c, adminSessionRoleModeCookieName, {
    path: adminSessionCookiePath,
  })
  clearSessionActiveRole(c)
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

async function withSessionActiveRole(
  c: ServiceRequestContext,
  user: UserCredential,
): Promise<UserCredential> {
  const roles = await listUserSessionRoles(c, user.id)
  const activeRoleId = await getSessionActiveRoleId(c, user)
  const activeRole = roles.find((role) => role.id === activeRoleId)

  return {
    ...user,
    activeRoleId,
    roleCode: activeRole?.code ?? user.roleCode,
    roleId: activeRoleId,
    roleIds: roles.map((role) => role.id),
  }
}
