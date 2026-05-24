import type { AppEnv } from '../app/infra/runtime/types'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { html } from 'hono/html'
import { jsxRenderer } from 'hono/jsx-renderer'
import { bootstrapGuard } from '../app/routes/-/utils/bootstrap-guard'
import userMiddleware from '../app/routes/user/_middleware'
import userLoginRoute from '../app/routes/user/login'
import { createTestServiceContext, TestServiceContext } from './helpers/service-context'

let testContext: TestServiceContext

beforeEach(async () => {
  testContext = await createTestServiceContext({ runMigrations: false })
  await markDatabaseAsPartiallyMigrated(testContext)
})

afterEach(async () => {
  await testContext.cleanup()
})

describe('bootstrap migration guard', () => {
  test('redirects admin pages to update management when migrations are pending', async () => {
    const response = await createBootstrapGuardApp().request('/admin/dashboard')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/admin/system/update')
  })

  test('shows a maintenance status for user pages when migrations are pending', async () => {
    const response = await createBootstrapGuardApp().request('/user/profile')
    const html = await response.text()

    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(html).toContain('系统维护')
    expect(html).toContain('服务正在升级，请稍后再试。')
    expect(html).not.toContain('当前代码版本和数据库迁移版本不一致')
    expect(html).not.toContain('0015_file_s3_public_base_url')
    expect(html).not.toContain('登录后升级')
    expect(html).not.toContain('更新管理')
  })

  test('allows login pages when migrations are pending', async () => {
    const response = await createBootstrapGuardApp().request('/user/login')

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('login page')
  })

  test('renders the login page during pending migrations without reading user tables', async () => {
    rejectUserTableReads(testContext)
    const response = await createUserLoginApp().request('/user/login', {
      headers: {
        cookie: 'hono_admin_session=1.1767225600000.invalid',
      },
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('登录系统')
    expect(html).not.toContain('服务暂时不可用')
  })

  test('redirects install page to update management when an existing database has pending migrations', async () => {
    const response = await createBootstrapGuardApp().request('/install')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/admin/system/update')
  })
})

function createBootstrapGuardApp() {
  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    c.cache = testContext.ctx.cache
    c.config = testContext.ctx.config
    c.db = testContext.ctx.db
    c.now = testContext.ctx.now
    c.runtime = testContext.ctx.runtime
    await next()
  })
  app.use('*', jsxRenderer(({ children, ...options }) => {
    if (options.layout === false) {
      return html`<html><body>${children}</body></html>`
    }

    return html`<html><body><div data-layout="true">${children}</div></body></html>`
  }))
  app.use('*', bootstrapGuard)
  app.get('/install', (c) => c.text('install page'))
  app.get('/admin/dashboard', (c) => c.text('admin dashboard'))
  app.get('/user/profile', (c) => c.text('user profile'))
  app.get('/user/login', (c) => c.text('login page'))

  return app
}

function createUserLoginApp() {
  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    c.cache = testContext.ctx.cache
    c.config = testContext.ctx.config
    c.db = testContext.ctx.db
    c.now = testContext.ctx.now
    c.runtime = testContext.ctx.runtime
    await next()
  })
  app.use('*', jsxRenderer(({ children, ...options }) => {
    if (options.layout === false) {
      return html`<html><body>${children}</body></html>`
    }

    return html`<html><body><div data-layout="true">${children}</div></body></html>`
  }))
  app.get('/user/login', bootstrapGuard, ...userMiddleware, ...userLoginRoute)

  return app
}

function rejectUserTableReads(context: TestServiceContext): void {
  const originalDb = context.ctx.db
  const db = Object.assign(Object.create(originalDb), {
    first: async (sql: string, params?: Parameters<typeof originalDb.first>[1]) => {
      if (sql.includes('sys_user')) {
        throw new Error('unexpected sys_user read')
      }

      return originalDb.first(sql, params)
    },
    query: async (sql: string, params?: Parameters<typeof originalDb.query>[1]) => {
      if (sql.includes('sys_user')) {
        throw new Error('unexpected sys_user read')
      }

      return originalDb.query(sql, params)
    },
  }) as typeof originalDb

  context.ctx.db = db
  context.ctx.runtime.db = db
}

async function markDatabaseAsPartiallyMigrated(
  context: TestServiceContext,
): Promise<void> {
  await context.ctx.db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `)
  await context.ctx.db.execute(
    'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
    [
      '0001_admin_core',
      'create admin core tables',
      1767225600000,
    ],
  )
}
