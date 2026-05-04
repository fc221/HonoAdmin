import type { ServiceRequestContext } from '../types'
import {
  clearAdminSession,
  createRequestOperateLog,
  getAdminSessionUser,
} from '../admin'

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
