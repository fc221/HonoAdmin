import type { Context } from 'hono'

export function verifyAdminBearerToken(token: string, c: Context): boolean {
  const expectedToken = c.config.jwtSecret

  return !!expectedToken && token === expectedToken
}
