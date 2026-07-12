import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { describe, expect, test } from 'bun:test'
import app, { setApiRuntimeContextMiddleware } from '../apps/server/src/app'
import { createUser } from '../apps/server/src/service/admin/system/user'
import { UserStatus } from '../apps/server/src/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

describe('session user cache', () => {
  test('repeat requests reuse the cached session instead of querying the database', async () => {
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
            // 只数会话鉴权那两条(用户凭证 + 用户角色),业务接口自己的查询不算。
            if (typeof args[0] === 'string' && args[0].includes('sys_user')) {
              queries += 1
            }
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

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'cache.root',
      })

      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'cache.root' }),
        headers: { 'Content-Type': 'application/json', 'x-real-ip': '127.0.0.20' },
        method: 'POST',
      })
      expect(login.status).toBe(200)
      const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? ''

      // 第一次受保护请求要查库(用户凭证 + 角色),之后同一 cookie 应全部命中缓存。
      const first = await app.request('/api/admin/web/page', { headers: { Cookie: cookie } })
      queries = 0
      const second = await app.request('/api/admin/web/page', { headers: { Cookie: cookie } })
      const queriesForCachedSession = queries

      // 畸形 / 过期的伪造 cookie 在查库前就被拒,连一次库都不该打。
      queries = 0
      const forged = await app.request('/api/admin/web/page', {
        headers: { Cookie: 'hono_admin_session=999999.1.deadbeef' },
      })

      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      expect(queriesForCachedSession).toBe(0)
      expect(forged.status).toBe(401)
      expect(queries).toBe(0)
    } finally {
      await testContext.cleanup()
    }
  })
})
