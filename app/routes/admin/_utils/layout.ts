import type { Context } from 'hono'
import type {
  MenuItem,
} from '../../../service/admin/system/menu/consts'
import type {
  UserHeaderProfile,
  UserSessionRole,
} from '../../../service/admin/system/user/dto'
import { getAdminSessionUser } from '../../../service/admin/session'
import { userMenus } from '../../../service/admin/system/menu/consts'
import { listAuthorizedAdminMenus } from '../../../service/admin/system/role'
import {
  getUserHeaderProfileById,
  listUserSessionRoles,
} from '../../../service/admin/system/user'
import { getRenderableSiteConfig } from '../../_utils/site'

export interface AdminLayoutData {
  canSwitchRole: boolean
  menus: MenuItem[]
  siteTitle: string
  user: UserHeaderProfile | null
}

export async function getAdminLayoutData(
  c: Context,
): Promise<AdminLayoutData> {
  const sessionUser = await getAdminSessionUser(c)
  const [authorizedAdminMenus, profile, roles, siteConfig] = await Promise.all([
    listAuthorizedAdminMenus(c, sessionUser),
    sessionUser
      ? getUserHeaderProfileById(c, sessionUser.id)
      : Promise.resolve(null),
    sessionUser
      ? listUserSessionRoles(c, sessionUser.id)
      : Promise.resolve([]),
    getRenderableSiteConfig(c),
  ])
  const activeRole = getActiveRole(roles, sessionUser?.roleId ?? null)
  const isUserSideRole = isUserRole(activeRole) || !hasMenuHref(authorizedAdminMenus)

  return {
    canSwitchRole: roles.length > 1,
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
}

export async function getUserLayoutData(
  c: Context,
): Promise<AdminLayoutData> {
  return getAdminLayoutData(c)
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
