import type { Context } from 'hono'
import type {
  MenuItem,
} from '../../../service/admin/system/menu/consts'
import type {
  UserHeaderProfile,
  UserSessionRole,
} from '../../../service/admin/system/user/dto'
import { buildCacheKey } from '../../../infra/cache/types'
import {
  adminLayoutCacheTtlSeconds,
  getAdminLayoutCacheVersion,
} from '../../../service/admin/layout-cache'
import { getAdminSessionUser } from '../../../service/admin/session'
import { userMenus } from '../../../service/admin/system/menu/consts'
import { listAuthorizedAdminMenus } from '../../../service/admin/system/role'
import {
  getUserHeaderIdentityById,
  listUserSessionRoles,
} from '../../../service/admin/system/user'
import { getRenderableSiteConfig } from './site'

export interface AdminLayoutData {
  menus: MenuItem[]
  siteTitle: string
  user: UserHeaderProfile | null
}

export interface LayoutRenderOptions {
  currentMenuName?: string
  layout?: false
  pageTitle?: string
}

const adminLayoutRequestCache = new WeakMap<Context, Promise<AdminLayoutData>>()

export async function getAdminLayoutData(
  c: Context,
): Promise<AdminLayoutData> {
  const cached = adminLayoutRequestCache.get(c)
  if (cached) {
    return cached
  }

  const promise = loadAdminLayoutData(c)
  adminLayoutRequestCache.set(c, promise)
  return promise
}

async function loadAdminLayoutData(c: Context): Promise<AdminLayoutData> {
  const sessionUser = await getAdminSessionUser(c)
  const cacheVersion = await getAdminLayoutCacheVersion(c)
  const cacheKey = sessionUser
    ? getAdminLayoutCacheKey(sessionUser.id, sessionUser.roleId, cacheVersion)
    : null
  const cachedLayout = cacheKey ? await readAdminLayoutCache(c, cacheKey) : null

  if (cachedLayout) {
    return cachedLayout
  }

  const [authorizedAdminMenus, profile, roles, siteConfig] = await Promise.all([
    listAuthorizedAdminMenus(c, sessionUser),
    sessionUser
      ? getUserHeaderIdentityById(c, sessionUser.id)
      : Promise.resolve(null),
    sessionUser
      ? listUserSessionRoles(c, sessionUser.id)
      : Promise.resolve([]),
    getRenderableSiteConfig(c),
  ])
  const activeRole = getActiveRole(roles, sessionUser?.roleId ?? null)
  const isUserSideRole = isUserRole(activeRole) || !hasMenuHref(authorizedAdminMenus)

  const layoutData: AdminLayoutData = {
    menus: isUserSideRole ? userMenus : authorizedAdminMenus,
    siteTitle: siteConfig.title,
    user: profile
      ? {
          ...profile,
          activeRoleId: sessionUser?.roleId ?? null,
          roles,
        }
      : null,
  }

  if (cacheKey) {
    await writeAdminLayoutCache(c, cacheKey, layoutData)
  }

  return layoutData
}

export async function getUserLayoutData(
  c: Context,
): Promise<AdminLayoutData> {
  return getAdminLayoutData(c)
}

export function isLayoutDisabled(options: LayoutRenderOptions): boolean {
  return options.layout === false
}

function hasMenuHref(items: MenuItem[]): boolean {
  return items.some((item) => !!item.href || hasMenuHref(item.children ?? []))
}

function getActiveRole(
  roles: UserSessionRole[],
  activeRoleId: number | null,
): UserSessionRole | null {
  return roles.find((role) => role.id === activeRoleId) ?? roles[0] ?? null
}

function isUserRole(role: UserSessionRole | null): boolean {
  return role?.code === 'user'
}

function getAdminLayoutCacheKey(
  userId: number,
  activeRoleId: number | null,
  cacheVersion: string,
): string {
  return buildCacheKey(
    'system',
    'layout',
    'admin',
    cacheVersion,
    userId,
    activeRoleId ?? 0,
  )
}

async function readAdminLayoutCache(
  c: Context,
  key: string,
): Promise<AdminLayoutData | null> {
  try {
    const cached = await c.cache.get<AdminLayoutData>(key)
    return isAdminLayoutData(cached) ? cached : null
  } catch {
    return null
  }
}

async function writeAdminLayoutCache(
  c: Context,
  key: string,
  layoutData: AdminLayoutData,
): Promise<void> {
  try {
    await c.cache.set(key, layoutData, {
      ttlSeconds: adminLayoutCacheTtlSeconds,
    })
  } catch {
    // Layout data is derived from SQL and can be recomputed on the next request.
  }
}

function isAdminLayoutData(value: unknown): value is AdminLayoutData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const layout = value as Partial<AdminLayoutData>
  return (
    Array.isArray(layout.menus)
    && typeof layout.siteTitle === 'string'
    && (
      layout.user === null
      || (
        !!layout.user
        && typeof layout.user.id === 'number'
        && Array.isArray(layout.user.roles)
      )
    )
  )
}
