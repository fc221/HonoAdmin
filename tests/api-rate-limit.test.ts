import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { describe, expect, test } from 'bun:test'
import app, { setApiRuntimeContextMiddleware } from '../apps/server/src/app'
import { updateConfigValues } from '../apps/server/src/service/admin/system/config'
import { createTestServiceContext } from './helpers/service-context'

describe('api rate limit', () => {
  test('throttles by client ip using the threshold configured in the admin panel', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext
    let queries = 0

    try {
      const countingDb = new Proxy(ctx.db, {
        get(target, property, receiver) {
          const value = Reflect.get(target, property, receiver)
          if (typeof value !== 'function' || (property !== 'first' && property !== 'query')) {
            return value
          }

          return (...args: unknown[]) => {
            queries += 1
            return (value as (...input: unknown[]) => unknown).apply(target, args)
          }
        },
      })

      setApiRuntimeContextMiddleware(async (c: Context<AppEnv>, next: Next) => {
        c.runtime = ctx.runtime
        c.db = countingDb
        c.cache = ctx.cache
        c.config = ctx.config
        c.now = ctx.now
        await next()
      })

      // 后台「安全配置」把阈值改成 3,限流必须跟着走,而不是用代码里的默认值 120。
      await updateConfigValues(ctx, {
        configType: 'security',
        values: {
          api_rate_limit_enabled: 'true',
          api_rate_limit_max: '3',
          api_rate_limit_window_seconds: '60',
        },
      })

      const request = () => app.request('/api/health', {
        headers: { 'x-real-ip': '203.0.113.7' },
      })

      const statuses: number[] = []
      for (let index = 0; index < 4; index += 1) {
        statuses.push((await request()).status)
      }

      // 换个 IP 不受影响。
      const otherIp = await app.request('/api/health', {
        headers: { 'x-real-ip': '203.0.113.8' },
      })

      // 被限流的请求不该打数据库。
      queries = 0
      const throttled = await request()

      expect(statuses.slice(0, 3).every((status) => status === 200)).toBe(true)
      expect(statuses[3]).toBe(429)
      expect(otherIp.status).toBe(200)
      expect(throttled.status).toBe(429)
      expect(queries).toBe(0)
    } finally {
      await testContext.cleanup()
    }
  })
})
