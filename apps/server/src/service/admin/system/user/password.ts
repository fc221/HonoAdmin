import { toHex } from '@hono-admin/utils/crypto'

export const passwordHashAlgorithm = 'pbkdf2-sha256'
// Cloudflare Workers rejects PBKDF2 requests above 100000 iterations.
export const passwordHashIterations = 100000

export async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16)
  const digest = await pbkdf2Hex(password, salt, passwordHashIterations)
  return `${passwordHashAlgorithm}:${passwordHashIterations}:${salt}:${digest}`
}

export async function pbkdf2Hex(
  password: string,
  salt: string,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      hash: 'SHA-256',
      iterations,
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
    },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(new Uint8Array(hash))
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}
