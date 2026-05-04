import type { Context } from 'hono'
import type { AppEnv } from '../../infra/runtime'
import { createMiddleware } from 'hono/factory'
import { getDatabaseMigrationStatus } from '../admin/system/update'

const installPath = '/install'
const migrationPaths = new Set([
  '/admin/login',
  '/admin/logout',
  '/user/login',
  '/user/logout',
  '/admin/system/update',
  '/admin/system/update/status',
])

export const guard = createMiddleware<AppEnv>(async (c, next) => {
  if (isBypassPath(c.req.path)) {
    await next()
    return
  }

  if (!c.config.bootstrap.isConfigured) {
    if (c.req.path === installPath) {
      await next()
      return
    }

    return handleRedirect(c, installPath, '运行时配置尚未完成。')
  }

  const migration = await getDatabaseMigrationStatus(c)
  if (migration.isComplete) {
    await next()
    return
  }

  if (migration.isFreshDatabase) {
    if (c.req.path === installPath) {
      await next()
      return
    }

    return handleRedirect(c, installPath, '数据库尚未初始化。')
  }

  if (migrationPaths.has(c.req.path)) {
    await next()
    return
  }

  return handleRedirect(c, '/admin/system/update', '数据库需要先完成迁移。')
})

function handleRedirect(
  c: Context<AppEnv>,
  path: string,
  message: string,
): Response {
  if (c.req.method === 'GET') {
    return c.redirect(path, 302)
  }

  return c.text(message, 409)
}

function isBypassPath(path: string): boolean {
  return (
    path === '/favicon.ico'
    || path.startsWith('/app/')
    || path.startsWith('/static/')
  )
}
