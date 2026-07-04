import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { canAccessAdminPath } from '../../service/admin/system/role'
import { isAdminInstalled } from '../../service/admin/system/user'
import { getOptionalSessionUser } from './session'

export async function requireApiSession(
  c: Context<AppEnv>,
  next: Next,
): Promise<void | Response> {
  const installed = await isAdminInstalled(c).catch(() => false)
  if (!installed) {
    return c.json({ message: '系统尚未安装。' }, 428)
  }

  const user = await getOptionalSessionUser(c)
  if (!user) {
    return c.json({ message: '用户未登录。' }, 401)
  }

  if (c.req.path.startsWith('/api/admin/')) {
    const target = getAdminPermissionTarget(c)
    if (!await canAccessAdminPath(c, user, target.path, target.method, target.actionKey)) {
      return c.json({ message: '没有权限访问该后台功能。' }, 403)
    }
  }

  await next()
}

function getAdminPermissionTarget(c: Context<AppEnv>): {
  actionKey: string
  method: string
  path: string
} {
  if (c.req.path === '/api/admin/layout') {
    return { actionKey: '*', method: 'GET', path: '/admin' }
  }

  if (c.req.path === '/api/admin/dashboard') {
    return { actionKey: '*', method: 'GET', path: '/admin/dashboard' }
  }

  const featureTarget = getAdminFeatureTarget(c)
  if (!featureTarget) {
    return { actionKey: '*', method: c.req.method, path: '/admin' }
  }

  const isDetailPath = featureTarget.detail && !featureTarget.actionOverride
  const path = isDetailPath ? `${featureTarget.adminPath}/${featureTarget.detail}` : featureTarget.adminPath

  return {
    actionKey: featureTarget.actionOverride ?? resolveAdminActionKey(c.req.method),
    method: c.req.method === 'GET' ? 'GET' : 'POST',
    path,
  }
}

function resolveAdminActionKey(method: string): string {
  if (method === 'DELETE') {
    return 'delete'
  }

  if (method === 'PUT') {
    return 'edit'
  }

  if (method === 'POST') {
    return 'create'
  }

  return '*'
}

const adminFeaturePaths: Array<{
  adminPath: string
  apiPrefix: string
}> = [
  { adminPath: '/admin/system/user', apiPrefix: '/api/admin/user' },
  { adminPath: '/admin/system/config', apiPrefix: '/api/admin/system/config' },
  { adminPath: '/admin/system/cron', apiPrefix: '/api/admin/system/cron' },
  { adminPath: '/admin/system/file', apiPrefix: '/api/admin/system/file' },
  { adminPath: '/admin/system/operate-log', apiPrefix: '/api/admin/system/operate-log' },
  { adminPath: '/admin/system/role', apiPrefix: '/api/admin/system/role' },
  { adminPath: '/admin/system/update', apiPrefix: '/api/admin/system/update' },
  { adminPath: '/admin/web/feedback', apiPrefix: '/api/admin/web/feedback' },
  { adminPath: '/admin/web/notification', apiPrefix: '/api/admin/web/notification' },
  { adminPath: '/admin/web/page', apiPrefix: '/api/admin/web/page' },
]

function getAdminFeatureTarget(c: Context<AppEnv>): {
  actionOverride?: string
  adminPath: string
  detail?: string
} | null {
  for (const feature of adminFeaturePaths) {
    if (c.req.path !== feature.apiPrefix && !c.req.path.startsWith(`${feature.apiPrefix}/`)) {
      continue
    }

    const detail = c.req.path.slice(feature.apiPrefix.length).replace(/^\/+/, '')
    const isConfigPanelAction = feature.adminPath === '/admin/system/config'
      && (detail === 'panel' || detail === 'values')
    const isUpdateMigrateAction = feature.adminPath === '/admin/system/update'
      && detail === 'migrate'

    return {
      actionOverride: isConfigPanelAction
        ? '*'
        : isUpdateMigrateAction
          ? 'migrate'
          : detail === 'upload'
            ? 'upload'
            : detail === 'clear'
              ? 'clear'
              : detail.endsWith('/run')
                ? 'run'
                : undefined,
      adminPath: feature.adminPath,
      detail,
    }
  }

  return null
}
