import type { Context } from 'hono'
import type {
  MenuItem,
  UserHeaderProfile,
  UserSessionRole,
} from '../../../service'
import {
  getAdminSessionUser,
  getUserHeaderProfileById,
  listAuthorizedAdminMenus,
  listUserSessionRoles,
  userMenus,
} from '../../../service'
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
