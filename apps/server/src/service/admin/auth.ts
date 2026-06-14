import type { ServiceRequestContext } from '../types'
import { constantTimeEqual } from '@hono-admin/utils/crypto'

export function verifyAdminBearerToken(
  token: string,
  c: ServiceRequestContext,
): boolean {
  const expectedToken = c.config.jwtSecret

  return !!expectedToken && constantTimeEqual(token, expectedToken)
}
