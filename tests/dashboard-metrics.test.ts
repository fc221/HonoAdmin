import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { describe, expect, test } from 'bun:test'
import app, { setApiRuntimeContextMiddleware } from '../apps/server/src/app'
import { createUser } from '../apps/server/src/service/admin/system/user'
import { UserStatus } from '../apps/server/src/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

describe('dashboard metric reads', () => {
  test('dashboard never runs COUNT/SUM/GROUP BY over the operate log table', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext
    const offending: string[] = []

    try {
      const trackingDb = new Proxy(ctx.db, {
        get(target, property, receiver) {
          const value = Reflect.get(target, property, receiver)
          if (typeof value !== 'function' || (property !== 'query' && property !== 'first')) {
            return value
          }
          return (...args: unknown[]) => {
            const sql = String(args[0] ?? '')
            // 操作日志表上的聚合(COUNT / SUM / GROUP BY)属于全表扫描风险,统计应改读 sys_metric_bucket。
            if ((/sys_operate_log/i).test(sql) && (/COUNT\s*\(|SUM\s*\(|GROUP\s+BY/i).test(sql)) {
              offending.push(sql.replace(/\s+/g, ' ').trim())
            }
            return (value as (...input: unknown[]) => unknown).apply(target, args)
          }
        },
      })

      setApiRuntimeContextMiddleware(async (c: Context<AppEnv>, next: Next) => {
        c.runtime = ctx.runtime
        c.db = trackingDb as never
        c.cache = ctx.cache
        c.config = ctx.config
        c.now = ctx.now
        await next()
      })

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'dash.root',
      })
      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'dash.root' }),
        headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.20' },
        method: 'POST',
      })
      const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? ''

      const dashboard = await app.request('/api/admin/dashboard', { headers: { Cookie: cookie } })
      const payload = await dashboard.json()

      expect(dashboard.status).toBe(200)
      // 无桶数据时趋势保留 7 个天点但值全为 0(布局稳定),区间计数为 0,且不回退全表扫描。
      expect(payload.activity.length).toBeGreaterThan(0)
      expect(payload.activity.every((point: { total: number }) => point.total === 0)).toBe(true)
      expect(payload.stats.find((s: { label: string }) => s.label.startsWith('操作日志'))?.value).toBe('0')
      expect(offending).toEqual([])
    } finally {
      await testContext.cleanup()
    }
  })
})
