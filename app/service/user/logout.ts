import type { ServiceRequestContext } from '../types'
import {
  clearAdminSession,
  getAdminSessionUser,
} from '../admin/session'
import { createRequestOperateLog } from '../admin/system/operate-log'

export async function logoutUser(c: ServiceRequestContext): Promise<void> {
  const user = await getAdminSessionUser(c)

  await createRequestOperateLog(c, {
    logMsg: user ? `用户退出 ${user.username}` : '用户退出',
    logType: 'logout',
    method: 'user.logout',
    userId: user?.id ?? null,
  })

  clearAdminSession(c)
}
