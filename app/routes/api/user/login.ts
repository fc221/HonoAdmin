import { validator } from 'hono-openapi'
import { createRoute } from 'honox/factory'
import { z } from 'zod'
import {
  describeApiRoute,
  jsonResponse,
  withApiError,
} from '../-/openapi'
import { apiErrorResponseSchema } from '../-/schemas'
import { userRecordSchema } from '../../../service/admin/system/user/dto'
import {
  clearRateLimit,
  consumeRateLimit,
  createRateLimitKey,
} from '../../../service/security/rate-limit'
import {
  loginUserWithApiToken,
} from '../../../service/user/api-token'
import { userLoginSchema } from '../../../service/user/login'
import {
  TooManyRequestsError,
  UnauthorizedError,
} from '../../../utils/errors'
import { getClientIp } from '../../../utils/request'

const apiUserLoginRequestSchema = userLoginSchema

const apiUserLoginResponseSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    expiresAt: z.number().int().positive(),
    tokenType: z.literal('Bearer'),
    user: userRecordSchema,
  }),
  ok: z.literal(true),
})

export const POST = createRoute(
  describeApiRoute({
    includeAuthResponses: false,
    responses: {
      200: jsonResponse(apiUserLoginResponseSchema, 'User API access token.'),
      401: jsonResponse(apiErrorResponseSchema, 'Invalid credentials.'),
      429: jsonResponse(apiErrorResponseSchema, 'Too many login attempts.'),
    },
    security: false,
    tags: ['User'],
  }),
  validator('json', apiUserLoginRequestSchema),
  (c) => withApiError(c, async () => {
    const input = c.req.valid('json')
    const clientIp = getClientIp(c)
    const ipRateLimitKey = await createRateLimitKey('login-ip', clientIp)
    const accountRateLimitKey = await createRateLimitKey(
      'login-account',
      clientIp,
      input.username.trim().toLowerCase(),
    )

    try {
      await consumeRateLimit(c, {
        key: ipRateLimitKey,
        limit: c.config.security.loginRateLimitIpMax,
        windowSeconds: c.config.security.loginRateLimitWindowSeconds,
      })
      await consumeRateLimit(c, {
        key: accountRateLimitKey,
        limit: c.config.security.loginRateLimitAccountMax,
        windowSeconds: c.config.security.loginRateLimitWindowSeconds,
      })
    } catch (error) {
      if (error instanceof TooManyRequestsError) {
        c.header('Retry-After', String(getRetryAfterSeconds(error.details)))
      }
      throw error
    }

    const result = await loginUserWithApiToken(c, input)
    if (!result) {
      throw new UnauthorizedError('账号或密码不正确。')
    }

    await Promise.all([
      clearRateLimit(c, accountRateLimitKey),
      clearRateLimit(c, ipRateLimitKey),
    ])

    c.header('Cache-Control', 'no-store')
    return c.json({
      data: {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        tokenType: result.tokenType,
        user: result.user,
      },
      ok: true,
    })
  }),
)

function getRetryAfterSeconds(details: unknown): number {
  if (!details || typeof details !== 'object') {
    return 60
  }

  const retryAfterSeconds = (details as { retryAfterSeconds?: unknown })
    .retryAfterSeconds
  return typeof retryAfterSeconds === 'number' ? retryAfterSeconds : 60
}
