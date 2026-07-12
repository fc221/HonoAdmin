import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { describe, expect, test } from 'bun:test'
import app, { setApiRuntimeContextMiddleware } from '../apps/server/src/app'
import { listRoles } from '../apps/server/src/service/admin/system/role'
import { createUser } from '../apps/server/src/service/admin/system/user'
import { UserStatus } from '../apps/server/src/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

function wireRuntime(ctx: {
  cache: unknown
  config: unknown
  db: unknown
  now: unknown
  runtime: unknown
}): void {
  setApiRuntimeContextMiddleware(async (c: Context<AppEnv>, next: Next) => {
    c.runtime = ctx.runtime as never
    c.db = ctx.db as never
    c.cache = ctx.cache as never
    c.config = ctx.config as never
    c.now = ctx.now as never
    await next()
  })
}

function login(username: string): Promise<Response> {
  return app.request('/api/auth/login', {
    body: JSON.stringify({ password: 'secret123', remember: true, username }),
    headers: { 'Content-Type': 'application/json', 'x-real-ip': '198.51.100.7' },
    method: 'POST',
  })
}

function cookieOf(response: Response): string {
  return response.headers.get('set-cookie')?.split(';')[0] ?? ''
}

describe('security hardening', () => {
  test('admin dashboard withholds system panels from non-admin roles', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext

    try {
      wireRuntime(ctx)

      const userRoleId = (await listRoles(ctx)).find((role) => role.code === 'user')?.id
      expect(userRoleId).toBeDefined()
      if (!userRoleId) {
        throw new Error('Expected default user role to exist.')
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
        username: 'plain.user',
      })

      const adminDash = await app.request('/api/admin/dashboard', {
        headers: { Cookie: cookieOf(await login('root.admin')) },
      })
      const adminPayload = await adminDash.json()

      const userDash = await app.request('/api/admin/dashboard', {
        headers: { Cookie: cookieOf(await login('plain.user')) },
      })
      const userPayload = await userDash.json()

      // 管理员拿到完整面板。
      expect(adminDash.status).toBe(200)
      expect(adminPayload.canViewSystemPanels).toBe(true)
      expect(adminPayload.system).not.toBeNull()

      // 默认 user 角色能到达接口(持 admin.dashboard.view),但敏感面板一律被抽走,只留基础 stats。
      expect(userDash.status).toBe(200)
      expect(userPayload.canViewSystemPanels).toBe(false)
      expect(userPayload.system).toBeNull()
      expect(userPayload.load).toBeNull()
      expect(userPayload.logs).toEqual([])
      expect(userPayload.feedbacks).toEqual([])
      expect(userPayload.activity).toEqual([])
      expect(userPayload.stats.length).toBeGreaterThan(0)
    } finally {
      await testContext.cleanup()
    }
  })

  test('install status hides the database url and env path once installed', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext

    try {
      // 覆盖 bootstrap:模拟外部 MySQL 部署,连接串含库凭据。
      ctx.config.bootstrap = {
        canWriteConfig: true,
        configPath: '/srv/app/.env',
        isConfigured: true,
        missingKeys: [],
        requirements: [
          { isConfigured: true, key: 'DATABASE_URL', value: 'mysql://u:p@db.internal/app' },
          { isConfigured: true, isSecret: true, key: 'SESSION_SECRET', value: 'topsecret' },
        ],
        runtimeTarget: 'bun',
      } as never
      wireRuntime(ctx)

      // 未安装:安装向导要预填,DATABASE_URL 保留;SESSION_SECRET 始终脱敏。
      const before = await (await app.request('/api/install/status')).json()
      const beforeDb = before.bootstrap.requirements.find((r: { key: string }) => r.key === 'DATABASE_URL')
      const beforeSecret = before.bootstrap.requirements.find((r: { key: string }) => r.key === 'SESSION_SECRET')
      expect(before.installed).toBe(false)
      expect(beforeDb.value).toBe('mysql://u:p@db.internal/app')
      expect(beforeSecret.value).toBeUndefined()

      // 安装完成后,匿名读到的连接串与 .env 路径必须被抹掉。
      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'installed.root',
      })
      const after = await (await app.request('/api/install/status')).json()
      const afterDb = after.bootstrap.requirements.find((r: { key: string }) => r.key === 'DATABASE_URL')
      expect(after.installed).toBe(true)
      expect(afterDb.value).toBeUndefined()
      expect(after.bootstrap.configPath).toBeUndefined()
    } finally {
      await testContext.cleanup()
    }
  })
})
