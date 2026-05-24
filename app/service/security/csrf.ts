import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export const csrfCookieName = 'hono_admin_csrf'
export const csrfFieldName = '_csrf'
export const csrfHeaderName = 'X-HonoAdmin-CSRF'

const csrfTokenMaxAgeSeconds = 60 * 60 * 8
const csrfCookiePath = '/'
const csrfTokenBytes = 32
const preparedTokens = new WeakMap<Context, string>()

export function getPreparedCsrfToken(c: Context): string {
  return preparedTokens.get(c) ?? ''
}

export async function prepareCsrfToken(c: Context): Promise<string> {
  const current = getCookie(c, csrfCookieName)
  const token = current && await verifySignedToken(c, current)
    ? current
    : await createSignedToken(c)

  preparedTokens.set(c, token)
  setCsrfCookie(c, token)
  return token
}

export async function verifyCsrfRequest(c: Context): Promise<boolean> {
  const cookieToken = getCookie(c, csrfCookieName)
  if (!cookieToken || !await verifySignedToken(c, cookieToken)) {
    return false
  }

  const requestToken = await getCsrfRequestToken(c)
  return !!requestToken && constantTimeEqual(requestToken, cookieToken)
}

export function clearPreparedCsrfToken(c: Context): void {
  preparedTokens.delete(c)
  deleteCookie(c, csrfCookieName, {
    path: csrfCookiePath,
  })
}

async function getCsrfRequestToken(c: Context): Promise<string | null> {
  const headerToken = c.req.header(csrfHeaderName)
  if (headerToken) {
    return headerToken
  }

  const contentType = c.req.header('content-type') ?? ''
  if (
    !contentType.includes('application/x-www-form-urlencoded')
    && !contentType.includes('multipart/form-data')
  ) {
    return null
  }

  try {
    const formData = await c.req.raw.clone().formData()
    const formToken = formData.get(csrfFieldName)
    return typeof formToken === 'string' ? formToken : null
  } catch {
    return null
  }
}

async function createSignedToken(c: Context): Promise<string> {
  const value = randomHex(csrfTokenBytes)
  const signature = await signValue(c, value)
  return `${value}.${signature}`
}

async function verifySignedToken(
  c: Context,
  token: string,
): Promise<boolean> {
  const [value, signature] = token.split('.')
  if (!value || !signature || !(/^[a-f0-9]{64}$/).test(value)) {
    return false
  }

  return constantTimeEqual(signature, await signValue(c, value))
}

async function signValue(c: Context, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getCsrfSecret(c)),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`csrf:${value}`),
  )

  return toHex(new Uint8Array(signature))
}

function getCsrfSecret(c: Context): string {
  return (
    c.config?.sessionSecret?.trim()
    || c.config?.jwtSecret?.trim()
    || c.config?.appName
    || 'hono-admin'
  )
}

function setCsrfCookie(c: Context, token: string): void {
  setCookie(c, csrfCookieName, token, {
    httpOnly: true,
    maxAge: csrfTokenMaxAgeSeconds,
    path: csrfCookiePath,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
  })
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

function toHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return diff === 0
}
