import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import type { UserCredential } from '../../service/admin/system/user'
import { clearAdminSession, getAdminSessionUser } from '../../service/admin/session'

export async function getOptionalSessionUser(c: Context<AppEnv>): Promise<UserCredential | null> {
  try {
    return await getAdminSessionUser(c)
  } catch {
    clearAdminSession(c)
    return null
  }
}
