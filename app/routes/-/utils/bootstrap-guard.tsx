import type { Context } from 'hono'
import type { AppEnv } from '../../../infra/runtime/types'
import { createMiddleware } from 'hono/factory'
import { getDatabaseMigrationStatus } from '../../../service/admin/system/update'
import MigrationMaintenancePage from '../components/migration-maintenance-page'

const installPath = '/install'
const migrationPaths = new Set([
  '/admin/login',
  '/admin/logout',
  '/user/login',
  '/user/logout',
  '/admin/system/update',
  '/admin/system/update/status',
])

export const bootstrapGuard = createMiddleware<AppEnv>(async (c, next) => {
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

  if (c.req.path === installPath) {
    return handleRedirect(c, '/admin/system/update', '已安装系统请前往更新管理执行迁移。')
  }

  if (migrationPaths.has(c.req.path)) {
    await next()
    return
  }

  if (!isAdminPath(c.req.path)) {
    return handleUserSideMigrationStatus(c)
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

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/')
}

function handleUserSideMigrationStatus(
  c: Context<AppEnv>,
): Promise<Response> | Response {
  if (c.req.method !== 'GET') {
    return c.text('系统正在维护升级，请稍后再试。', 409)
  }

  c.status(503)
  c.header('Cache-Control', 'no-store')
  c.header('Retry-After', '120')
  return c.render(<MigrationMaintenancePage />, { layout: false })
}
