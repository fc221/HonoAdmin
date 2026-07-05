import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { describe, expect, test } from 'bun:test'
import app, { setApiRuntimeContextMiddleware } from '../apps/server/src/app'
import {
  getConfigValue,
  listConfigs,
  upsertConfig,
} from '../apps/server/src/service/admin/system/config'
import { siteNameConfig } from '../apps/server/src/service/admin/system/config/constants'
import { createRole, listRoles } from '../apps/server/src/service/admin/system/role'
import { getDatabaseMigrationStatus } from '../apps/server/src/service/admin/system/update'
import {
  createUser,
  getUserCredentialByUsername,
  verifyUserPassword,
} from '../apps/server/src/service/admin/system/user'
import { UserStatus } from '../apps/server/src/service/admin/system/user/enum'
import { createWebNotification } from '../apps/server/src/service/admin/web/notification'
import { createWebPage } from '../apps/server/src/service/admin/web/page'
import { createTestServiceContext } from './helpers/service-context'

describe('API resource routes', () => {
  test('public page route renders a page by alias', async () => {
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

      await createWebPage(ctx, {
        alias: 'about-us',
        content: '<p>Hello <strong>world</strong></p><script>alert(1)</script>',
        summary: 'About <HonoAdmin>',
        title: 'About <Us>',
      })

      const response = await app.request('/page/about-us')
      const html = await response.text()
      const missing = await app.request('/page/missing-page')

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')
      expect(html).toContain('About &lt;Us&gt;')
      expect(html).toContain('About &lt;HonoAdmin&gt;')
      expect(html).toContain('<p>Hello <strong>world</strong></p>')
      expect(html).not.toContain('<script')
      expect(missing.status).toBe(404)
    } finally {
      await testContext.cleanup()
    }
  })

  test('web page and notification APIs reject invalid aliases on create and update', async () => {
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
      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'alias.root',
      })
      const login = await loginRequest('alias.root', 'secret123')
      expect(login.status).toBe(200)
      const cookie = getCookieHeader(login)

      const pageList = await app.request('/api/admin/web/page', {
        headers: { Cookie: cookie },
      })
      const pageListPayload = await pageList.json()
      const pageAliasField = pageListPayload.createFields.find(
        (field: { key: string }) => field.key === 'alias',
      )
      expect(pageAliasField).toMatchObject({
        pattern: '^[\\w-]+$',
        patternMessage: '页面别名只能包含英文字母、数字、下划线和横线。',
      })

      const pageCreate = await app.request('/api/admin/web/page', {
        body: JSON.stringify({ alias: '中文', content: '<p>content</p>', title: 'Page' }),
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        method: 'POST',
      })
      const page = await createWebPage(ctx, {
        alias: 'valid-page',
        content: '<p>content</p>',
        title: 'Page',
      })
      const pageDetail = await app.request(`/api/admin/web/page/${page.id}`, {
        headers: { Cookie: cookie },
      })
      const pageDetailPayload = await pageDetail.json()
      const pageEditAliasField = pageDetailPayload.fields.find(
        (field: { key: string }) => field.key === 'alias',
      )
      const pageUpdate = await app.request(`/api/admin/web/page/${page.id}`, {
        body: JSON.stringify({ alias: 'has.dot', content: '<p>content</p>', title: 'Page' }),
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        method: 'PUT',
      })

      const notificationCreate = await app.request('/api/admin/web/notification', {
        body: JSON.stringify({ alias: '中文', content: '<p>content</p>', title: 'Notice' }),
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        method: 'POST',
      })
      const notification = await createWebNotification(ctx, {
        alias: 'valid-notice',
        content: '<p>content</p>',
        title: 'Notice',
      })
      const notificationUpdate = await app.request(
        `/api/admin/web/notification/${notification.id}`,
        {
          body: JSON.stringify({
            alias: 'has&symbol',
            content: '<p>content</p>',
            title: 'Notice',
          }),
          headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
          method: 'PUT',
        },
      )

      expect(pageCreate.status).toBe(400)
      expect(pageEditAliasField).toMatchObject({
        pattern: '^[\\w-]+$',
        patternMessage: '页面别名只能包含英文字母、数字、下划线和横线。',
      })
      expect(pageUpdate.status).toBe(400)
      expect(notificationCreate.status).toBe(400)
      expect(notificationUpdate.status).toBe(400)
    } finally {
      await testContext.cleanup()
    }
  })

  test('install migration is public only before the first admin exists', async () => {
    const testContext = await createTestServiceContext({ runMigrations: false })
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

      const initialMigrate = await app.request('/api/install/migrate', { method: 'POST' })
      expect(initialMigrate.status).toBe(200)

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'install.root',
      })

      const installedMigrate = await app.request('/api/install/migrate', { method: 'POST' })
      expect(installedMigrate.status).toBe(403)
    } finally {
      await testContext.cleanup()
    }
  })

  test('install status reports pending migrations before first install', async () => {
    const testContext = await createTestServiceContext({ runMigrations: false })
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

      const response = await app.request('/api/install/status')
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.installed).toBe(false)
      expect(payload.migration).toMatchObject({
        isComplete: false,
        isFreshDatabase: true,
      })
      expect(payload.migration.pendingCount).toBeGreaterThan(0)
    } finally {
      await testContext.cleanup()
    }
  })

  test('install status redacts bootstrap secret values', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext

    try {
      ctx.config.bootstrap = {
        ...ctx.config.bootstrap,
        requirements: [
          {
            description: 'database',
            isConfigured: true,
            key: 'DATABASE_URL',
            label: '数据库地址',
            value: './test.sqlite',
          },
          {
            description: 'jwt',
            isConfigured: true,
            isSecret: true,
            key: 'JWT_SECRET',
            label: 'JWT Secret',
            value: 'jwt-secret-leak',
          },
          {
            description: 'session',
            isConfigured: true,
            isSecret: true,
            key: 'SESSION_SECRET',
            label: 'Session Secret',
            value: 'session-secret-leak',
          },
        ],
      }
      setApiRuntimeContextMiddleware(async (c: Context<AppEnv>, next: Next) => {
        c.runtime = ctx.runtime
        c.db = ctx.db
        c.cache = ctx.cache
        c.config = ctx.config
        c.now = ctx.now
        await next()
      })

      const response = await app.request('/api/install/status')
      const payload = await response.json()
      const jwtRequirement = payload.bootstrap.requirements.find(
        (requirement: { key: string }) => requirement.key === 'JWT_SECRET',
      )
      const sessionRequirement = payload.bootstrap.requirements.find(
        (requirement: { key: string }) => requirement.key === 'SESSION_SECRET',
      )
      const databaseRequirement = payload.bootstrap.requirements.find(
        (requirement: { key: string }) => requirement.key === 'DATABASE_URL',
      )

      expect(response.status).toBe(200)
      expect(JSON.stringify(payload)).not.toContain('jwt-secret-leak')
      expect(JSON.stringify(payload)).not.toContain('session-secret-leak')
      expect(jwtRequirement.value).toBeUndefined()
      expect(sessionRequirement.value).toBeUndefined()
      expect(databaseRequirement.value).toBe('./test.sqlite')
    } finally {
      await testContext.cleanup()
    }
  })

  test('installed systems close install write endpoints before mutating site config', async () => {
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
      await upsertConfig(ctx, {
        configKey: siteNameConfig.configKey,
        configType: siteNameConfig.configType,
        configValue: 'Original Site',
      })
      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'installed.root',
      })

      const runtimeConfig = await app.request('/api/install/runtime-config', {
        body: JSON.stringify({
          appTimezone: 'Asia/Shanghai',
          cacheNamespace: 'hono-admin',
          databaseUrl: './hono-admin.sqlite',
          jwtSecret: 'a'.repeat(32),
          sessionSecret: 'b'.repeat(32),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const migrate = await app.request('/api/install/migrate', { method: 'POST' })
      const admin = await app.request('/api/install/admin', {
        body: JSON.stringify({
          confirmPassword: 'secret123',
          password: 'secret123',
          siteName: 'Pwned Site',
          username: 'pwned.root',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      expect(runtimeConfig.status).toBe(403)
      expect(migrate.status).toBe(403)
      expect(admin.status).toBe(403)
      expect(await getConfigValue(ctx, siteNameConfig.configType, siteNameConfig.configKey))
        .toBe('Original Site')
    } finally {
      await testContext.cleanup()
    }
  })

  test('login redirects pending installed migrations to update management with a session', async () => {
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

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'migration.root',
      })

      const migration = await getDatabaseMigrationStatus(ctx)
      expect(migration.latestCodeMigrationId).toBeTruthy()
      await ctx.db.execute('DELETE FROM _migrations WHERE id = ?', [
        migration.latestCodeMigrationId,
      ])

      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'migration.root' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const loginPayload = await login.json()

      expect(login.status).toBe(428)
      expect(loginPayload.message).toContain('待迁移')

      const updateStatus = await app.request('/api/admin/system/update/status', {
        headers: { Cookie: getCookieHeader(login) },
      })
      expect(updateStatus.status).toBe(200)
    } finally {
      await testContext.cleanup()
    }
  })

  test('login rate limit counts failures and successful login clears the counters', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext

    try {
      ctx.config.security = {
        ...ctx.config.security,
        loginRateLimitAccountMax: 2,
        loginRateLimitIpMax: 20,
        loginRateLimitWindowSeconds: 60,
      }
      setApiRuntimeContextMiddleware(async (c: Context<AppEnv>, next: Next) => {
        c.runtime = ctx.runtime
        c.db = ctx.db
        c.cache = ctx.cache
        c.config = ctx.config
        c.now = ctx.now
        await next()
      })

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'limit.root',
      })
      const roles = await listRoles(ctx)
      const userRoleId = roles.find((role) => role.code === 'user')?.id
      expect(userRoleId).toBeDefined()
      if (!userRoleId) {
        throw new Error('Expected default user role to exist.')
      }
      await createUser(ctx, {
        isRoot: false,
        password: 'secret123',
        roleIds: [userRoleId],
        status: UserStatus.NORMAL,
        username: 'clear.user',
      })

      expect((await loginRequest('limit.root', 'bad-secret')).status).toBe(401)
      expect((await loginRequest('LIMIT.ROOT', 'bad-secret')).status).toBe(401)
      expect((await loginRequest('limit.root', 'bad-secret')).status).toBe(429)

      expect((await loginRequest('clear.user', 'bad-secret')).status).toBe(401)
      expect((await loginRequest('clear.user', 'secret123')).status).toBe(200)
      expect((await loginRequest('clear.user', 'bad-secret')).status).toBe(401)
    } finally {
      await testContext.cleanup()
    }
  })

  test('update management migration uses admin permissions', async () => {
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

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'update.root',
      })

      const role = await createRole(ctx, {
        code: 'update-viewer-api',
        description: 'Update status only',
        menuNames: ['admin.system.update'],
        name: '更新状态查看员',
        permissionCodes: [
          'admin.system.update.view',
          'admin.system.update.status',
        ],
      })
      await createUser(ctx, {
        isRoot: false,
        password: 'secret123',
        roleId: role.id,
        status: UserStatus.NORMAL,
        username: 'update.viewer',
      })

      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'update.viewer' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      expect(login.status).toBe(200)
      const cookie = getCookieHeader(login)

      const status = await app.request('/api/admin/system/update/status', {
        headers: { Cookie: cookie },
      })
      expect(status.status).toBe(200)

      const migrate = await app.request('/api/admin/system/update/migrate', {
        headers: { Cookie: cookie },
        method: 'POST',
      })
      expect(migrate.status).toBe(403)
    } finally {
      await testContext.cleanup()
    }
  })

  test('user layout marks the user-side role active after login', async () => {
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

      expect(adminRoleId).toBeDefined()
      expect(userRoleId).toBeDefined()
      if (!adminRoleId || !userRoleId) {
        throw new Error('Expected default admin and user roles to exist.')
      }

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        roleIds: [userRoleId],
        status: UserStatus.NORMAL,
        username: 'role.surface',
      })

      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'role.surface' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      expect(login.status).toBe(200)

      const layout = await app.request('/api/user/layout', {
        headers: { Cookie: getCookieHeader(login) },
      })
      const payload = await layout.json()

      expect(layout.status).toBe(200)
      expect(payload.user?.activeRoleId).toBe(userRoleId)
    } finally {
      await testContext.cleanup()
    }
  })

  test('user profile avatar upload saves through the user API', async () => {
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
      const userRoleId = roles.find((role) => role.code === 'user')?.id

      expect(userRoleId).toBeDefined()
      if (!userRoleId) {
        throw new Error('Expected default user role to exist.')
      }

      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'avatar.root',
      })
      const user = await createUser(ctx, {
        isRoot: false,
        password: 'secret123',
        roleIds: [userRoleId],
        status: UserStatus.NORMAL,
        username: 'avatar.user',
      })
      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'avatar.user' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      expect(login.status).toBe(200)

      const form = new FormData()
      form.set('file', new File([pngBytes()], 'avatar.png', { type: 'image/png' }))
      const upload = await app.request('/api/user/profile/avatar', {
        body: form,
        headers: { Cookie: getCookieHeader(login) },
        method: 'POST',
      })
      const uploadPayload = await upload.json()

      expect(upload.status).toBe(200)
      expect(uploadPayload).toMatchObject({ ok: true })
      expect(uploadPayload.data.avatar).toContain('/uploads/avatar/')

      const detail = await app.request(`/api/user/profile/${user.id}`, {
        headers: { Cookie: getCookieHeader(login) },
      })
      const detailPayload = await detail.json()

      expect(detail.status).toBe(200)
      expect(detailPayload.data.avatar).toBe(uploadPayload.data.avatar)
    } finally {
      await testContext.cleanup()
    }
  })

  test('config APIs redact password values and keep existing secrets on blank save', async () => {
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
      await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        status: UserStatus.NORMAL,
        username: 'config.root',
      })
      await upsertConfig(ctx, {
        configKey: 'file_s3_secret_access_key',
        configType: 'file',
        configValue: 'super-secret',
      })
      await upsertConfig(ctx, {
        configKey: 'file_s3_bucket',
        configType: 'file',
        configValue: 'bucket-a',
      })

      const login = await loginRequest('config.root', 'secret123')
      expect(login.status).toBe(200)
      const cookie = getCookieHeader(login)

      const panel = await app.request('/api/admin/system/config/panel', {
        headers: { Cookie: cookie },
      })
      const panelText = await panel.text()
      const panelPayload = JSON.parse(panelText)
      const panelSecret = panelPayload.configs.find(
        (config: { configKey: string }) => config.configKey === 'file_s3_secret_access_key',
      )

      expect(panel.status).toBe(200)
      expect(panelText).not.toContain('super-secret')
      expect(panelSecret.configValue).toBe('')

      const secretConfig = (await listConfigs(ctx)).find(
        (config) => config.configKey === 'file_s3_secret_access_key',
      )
      expect(secretConfig).toBeDefined()
      if (!secretConfig) {
        throw new Error('Expected secret config to exist.')
      }

      const detail = await app.request(`/api/admin/system/config/${secretConfig.id}`, {
        headers: { Cookie: cookie },
      })
      const detailText = await detail.text()
      const detailPayload = JSON.parse(detailText)

      expect(detail.status).toBe(200)
      expect(detailText).not.toContain('super-secret')
      expect(detailPayload.data.configValue).toBe('')

      const blankSave = await app.request('/api/admin/system/config/values', {
        body: JSON.stringify({
          configType: 'file',
          values: {
            file_s3_bucket: 'bucket-b',
            file_s3_secret_access_key: '',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
          'Origin': 'http://127.0.0.1:5173',
          'Sec-Fetch-Site': 'same-origin',
        },
        method: 'POST',
      })
      expect(blankSave.status).toBe(200)
      expect(await getConfigValue(ctx, 'file', 'file_s3_bucket')).toBe('bucket-b')
      expect(await getConfigValue(ctx, 'file', 'file_s3_secret_access_key')).toBe('super-secret')

      const secretSave = await app.request('/api/admin/system/config/values', {
        body: JSON.stringify({
          configType: 'file',
          values: { file_s3_secret_access_key: 'next-secret' },
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
        method: 'POST',
      })
      expect(secretSave.status).toBe(200)
      expect(await getConfigValue(ctx, 'file', 'file_s3_secret_access_key')).toBe('next-secret')
    } finally {
      await testContext.cleanup()
    }
  })

  test('admin user update accepts blank optional fields without returning 500', async () => {
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

      expect(adminRoleId).toBeDefined()
      expect(userRoleId).toBeDefined()
      if (!adminRoleId || !userRoleId) {
        throw new Error('Expected default admin and user roles to exist.')
      }

      const admin = await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        roleIds: [userRoleId],
        status: UserStatus.NORMAL,
        username: 'admin',
      })

      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'admin' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      expect(login.status).toBe(200)
      const cookie = getCookieHeader(login)

      const update = await app.request(`/api/admin/user/${admin.id}`, {
        body: JSON.stringify({
          bio: '',
          gender: '',
          mail: '',
          nickname: '',
          password: '',
          phone: '',
          roleIds: [adminRoleId, userRoleId],
          status: UserStatus.NORMAL,
          username: 'admin',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
        method: 'PUT',
      })
      const updatePayload = await update.json()

      expect(update.status).toBe(200)
      expect(updatePayload).toMatchObject({
        data: {
          bio: null,
          gender: null,
          mail: null,
          nickname: null,
          phone: null,
          username: 'admin',
        },
        ok: true,
      })

      const credential = await getUserCredentialByUsername(ctx, 'admin')
      expect(await verifyUserPassword('secret123', credential?.password ?? '')).toBe(true)

      const switchRole = await app.request('/api/auth/role', {
        body: JSON.stringify({ roleId: userRoleId }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
        method: 'POST',
      })
      const switchPayload = await switchRole.json()

      expect(switchRole.status).toBe(200)
      expect(switchPayload).toMatchObject({
        data: {
          roleId: userRoleId,
          target: '/user',
        },
        ok: true,
      })
    } finally {
      await testContext.cleanup()
    }
  })
})

function getCookieHeader(response: Response): string {
  const setCookie = response.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()
  return setCookie?.split(';')[0] ?? ''
}

function loginRequest(username: string, password: string): Promise<Response> {
  return app.request('/api/auth/login', {
    body: JSON.stringify({ password, remember: true, username }),
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': '127.0.0.10',
    },
    method: 'POST',
  })
}

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89,
    0x50,
    0x4E,
    0x47,
    0x0D,
    0x0A,
    0x1A,
    0x0A,
    0x00,
    0x00,
    0x00,
    0x0D,
    0x49,
    0x48,
    0x44,
    0x52,
  ])
}
