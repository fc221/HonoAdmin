import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { adminMenus, flattenMenuItems } from '../../service/admin/system/menu/consts'
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

// 菜单是唯一注册点:权限映射从 adminMenus 推导(apiPrefix = '/api' + routePath),
// 新增资源只加菜单项即可,不再手工维护映射表。dashboard 在 getAdminPermissionTarget 里单独特判,
// 这里包含它也无害(精确路径已被提前返回)。
const adminFeaturePaths: Array<{
  adminPath: string
  apiPrefix: string
}> = flattenMenuItems(adminMenus)
  .filter((item) => Boolean(item.routePath))
  .map((item) => ({ adminPath: item.routePath!, apiPrefix: `/api${item.routePath}` }))

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
