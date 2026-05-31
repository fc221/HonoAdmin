import type { Context } from 'hono'
import type { ServiceRequestContext } from '../../../service/types'
import type { VerifiedUserApiToken } from '../../../service/user/api-token'
import { verifyUserApiToken } from '../../../service/user/api-token'
import { UnauthorizedError } from '../../../utils/errors'

export async function requireUserApiToken(
  c: ServiceRequestContext,
): Promise<VerifiedUserApiToken> {
  return verifyUserApiToken(c, getBearerToken(c))
}

function getBearerToken(c: Context): string {
  const authorization = c.req.header('authorization') ?? ''
  const [scheme, token] = authorization.split(/\s+/, 2)

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new UnauthorizedError('缺少 API 访问令牌。')
  }

  return token
}
