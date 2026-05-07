import type { AppEnv } from '../app/infra/runtime/types'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { middleware } from '../app/service/middleware'
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
    expect(html).toContain('当前代码版本和数据库迁移版本不一致')
    expect(html).toContain('0014_root_user_role_assignment')
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
  app.use('*', middleware.bootstrap.guard)
  app.get('/admin/dashboard', (c) => c.text('admin dashboard'))
  app.get('/user/profile', (c) => c.text('user profile'))

  return app
}

async function markDatabaseAsPartiallyMigrated(
  context: TestServiceContext,
): Promise<void> {
  await context.ctx.db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)
  await context.ctx.db.execute(
    'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
    [
      '0001_admin_core',
      'create admin core tables',
      '2026-01-01T00:00:00.000Z',
    ],
  )
}
