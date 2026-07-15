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
) {
  const siteConfig = await getSiteConfig(c).catch(() => ({ title: 'HonoAdmin' }))
  const sessionUser = await getOptionalSessionUser(c)
  const profile = sessionUser
    ? withSurfaceActiveRole(
        await getSessionProfileByUserId(c, sessionUser.id, sessionUser.roleId ?? null),
        surface,
      )
    : null
  const menus = surface === 'admin'
    ? sessionUser ? await listAuthorizedAdminMenus(c, sessionUser) : adminMenus
    : userMenus

  return {
    menus,
    siteTitle: siteConfig.title,
    user: profile,
  }
}

// 「当前角色」高亮跟随所在 surface:user 区高亮 user 角色,admin 区高亮管理端角色。
// 持久化的 activeRoleId 可能停留在上次切换的另一侧(如切到用户后又回到 /admin),
// 这里按 surface 归一化展示值。若当前角色已属于本侧则保留(兼顾一个账号有多个管理角色)。
export function withSurfaceActiveRole(
  profile: UserProfile | null,
  surface: 'admin' | 'user',
): UserProfile | null {
  if (!profile) {
    return profile
  }

  const matchesSurface = (role: UserProfile['roles'][number]) =>
    surface === 'user' ? role.code === 'user' : role.code !== 'user'

  const active = profile.roles.find((role) => role.id === profile.activeRoleId)
  if (active && matchesSurface(active)) {
    return profile
  }

  const surfaceRole = profile.roles.find(matchesSurface)
  return surfaceRole
    ? { ...profile, activeRoleId: surfaceRole.id }
    : profile
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
