import type { ServiceRequestContext } from '../types'

export function verifyAdminBearerToken(
  token: string,
  c: ServiceRequestContext,
): boolean {
  const expectedToken = c.config.jwtSecret

  return !!expectedToken && token === expectedToken
}
