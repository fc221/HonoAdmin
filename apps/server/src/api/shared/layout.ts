import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import type { UserProfile } from '../schema'
import { getSiteConfig } from '../../service/admin/system/config'
import { adminMenus, userMenus } from '../../service/admin/system/menu/consts'
import { listAuthorizedAdminMenus } from '../../service/admin/system/role'
import {
  getUserHeaderIdentityById,
  listUserSessionRoles,
} from '../../service/admin/system/user'
import { getOptionalSessionUser } from './session'

export async function getLayoutPayload(
  c: Context<AppEnv>,
  surface: 'admin' | 'user',
  activeMenuName: string,
) {
  const siteConfig = await getSiteConfig(c).catch(() => ({ title: 'HonoAdmin' }))
  const sessionUser = await getOptionalSessionUser(c)
  const profile = await getSessionProfile(c)
  const menus = surface === 'admin'
    ? sessionUser ? await listAuthorizedAdminMenus(c, sessionUser) : adminMenus
    : userMenus

  return {
    activeMenuName,
    menus,
    siteTitle: siteConfig.title,
    user: profile,
  }
}

export async function getSessionProfile(c: Context<AppEnv>): Promise<UserProfile | null> {
  const sessionUser = await getOptionalSessionUser(c)

  if (!sessionUser) {
    return null
  }

  return getSessionProfileByUserId(c, sessionUser.id, sessionUser.roleId ?? null)
}

export async function getSessionProfileByUserId(
  c: Context<AppEnv>,
  userId: number,
  activeRoleId: number | null = null,
): Promise<UserProfile | null> {
  const [identity, roles] = await Promise.all([
    getUserHeaderIdentityById(c, userId),
    listUserSessionRoles(c, userId),
  ])

  if (!identity) {
    return null
  }

  return {
    ...identity,
    activeRoleId,
    roles,
  }
}
