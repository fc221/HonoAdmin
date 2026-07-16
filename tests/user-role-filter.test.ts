import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { describe, expect, test } from 'bun:test'
import app, { setApiRuntimeContextMiddleware } from '../apps/server/src/app'
import { listRoles } from '../apps/server/src/service/admin/system/role'
import { createUser } from '../apps/server/src/service/admin/system/user'
import { UserStatus } from '../apps/server/src/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

describe('user list role filter', () => {
  test('filters by roleId and returns role names per row', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext

    try {
      setApiRuntimeContextMiddleware(async (c: Context<AppEnv>, next: Next) => {
        c.runtime = ctx.runtime
        c.db = ctx.db
        c.cache = ctx.cache
        c.config = ctx.config
        c.now = ctx.now
        await next()
      })

      const roles = await listRoles(ctx)
      const adminRoleId = roles.find((role) => role.code === 'admin')?.id
      const userRoleId = roles.find((role) => role.code === 'user')?.id
      if (!adminRoleId || !userRoleId) {
        throw new Error('Expected default admin and user roles to exist.')
      }

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'root.admin',
      })
      await createUser(ctx, {
        isRoot: false,
        password: 'secret123',
        roleIds: [userRoleId],
        status: UserStatus.NORMAL,
        username: 'only.user',
      })
      await createUser(ctx, {
        isRoot: false,
        password: 'secret123',
        roleIds: [adminRoleId, userRoleId],
        status: UserStatus.NORMAL,
        username: 'multi.role',
      })

      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'root.admin' }),
        headers: { 'Content-Type': 'application/json', 'x-real-ip': '198.51.100.9' },
        method: 'POST',
      })
      const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? ''

      const listBy = async (roleId?: number) => {
        const suffix = roleId ? `&roleId=${roleId}` : ''
        const res = await app.request(`/api/admin/system/user?page=1&pageSize=50${suffix}`, {
          headers: { Cookie: cookie },
        })
        return res.json()
      }
      const usernames = (payload: { rows: Array<{ username: string }> }) =>
        payload.rows.map((row) => row.username)

      const all = await listBy()
      const byAdmin = await listBy(adminRoleId)
      const byUser = await listBy(userRoleId)

      // 每行带角色名(供前端渲染角色 tag)。
      const multi = all.rows.find((row: { username: string }) => row.username === 'multi.role')
      expect(multi.roleNames).toContain('管理员')
      expect(multi.roleNames).toContain('用户')

      // 按「管理员」角色过滤:只有 user 角色的 only.user 被排除。
      expect(usernames(byAdmin)).not.toContain('only.user')
      expect(usernames(byAdmin)).toContain('multi.role')

      // 按「用户」角色过滤:only.user 与 multi.role 都在。
      expect(usernames(byUser)).toContain('only.user')
      expect(usernames(byUser)).toContain('multi.role')
    } finally {
      await testContext.cleanup()
    }
  })
})
