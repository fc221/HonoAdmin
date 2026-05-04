import type { Context } from 'hono'
import type { MenuItem, UserHeaderProfile } from '../../../service'
import {
  getAdminSessionUser,
  getUserHeaderProfileById,
  listAuthorizedAdminMenus,
} from '../../../service'

export interface AdminLayoutData {
  menus: MenuItem[]
  user: UserHeaderProfile | null
}

export async function getAdminLayoutData(
  c: Context,
): Promise<AdminLayoutData> {
  const sessionUser = await getAdminSessionUser(c)
  const [menus, user] = await Promise.all([
    listAuthorizedAdminMenus(c, sessionUser),
    sessionUser
      ? getUserHeaderProfileById(c, sessionUser.id)
      : Promise.resolve(null),
  ])

  return { menus, user }
}

export async function getAdminLayoutMenus(
  c: Context,
): Promise<MenuItem[]> {
  return listAuthorizedAdminMenus(c, await getAdminSessionUser(c))
}
