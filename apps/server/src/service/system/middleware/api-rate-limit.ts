import type { AppEnv } from '@hono-admin/runtime'
import { getRateLimitCache } from '@hono-admin/runtime/rate-limit-cache'
import { createMiddleware } from 'hono/factory'
import { getClientIp } from '../../../utils/request'
import { resolveSecurityLimits } from '../security/limits'
import { consumeRateLimit, createRateLimitKey } from '../security/rate-limit'

/**
 * 按客户端 IP 限制 /api/* 的请求频率,阈值来自后台「安全配置」,不写死。
 * 全程只碰缓存,不打数据库:超限的请求在进业务路由之前就被 429 掉。
 */
export const apiRateLimit = createMiddleware<AppEnv>(async (c, next) => {
  const limits = await resolveSecurityLimits(c)
  if (!limits.apiRateLimitEnabled) {
    return next()
  }

  await consumeRateLimit({ cache: getRateLimitCache(c.cache) }, {
    key: await createRateLimitKey('api-ip', getClientIp(c)),
    limit: limits.apiRateLimitMax,
    windowSeconds: limits.apiRateLimitWindowSeconds,
  })

  await next()
})
