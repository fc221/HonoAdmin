import type { ServiceRequestContext } from '../types'
import { z } from 'zod'
import { setAdminSession } from '../admin/session'
import { createRequestOperateLog } from '../admin/system/operate-log'
import {
  getUserCredentialByUsername,
  verifyUserPassword,
} from '../admin/system/user'

export const userLoginSchema = z.object({
  password: z.string(),
  remember: z.boolean().default(false),
  username: z.string().trim(),
})

export type UserLoginInput = z.input<typeof userLoginSchema>

export async function loginUser(
  c: ServiceRequestContext,
  input: UserLoginInput,
): Promise<boolean> {
  const loginInput = userLoginSchema.parse(input)
  const user = await getUserCredentialByUsername(c, loginInput.username)

  if (!user || !(await verifyUserPassword(loginInput.password, user.password))) {
    return false
  }

  await setAdminSession(c, user, loginInput.remember)
  await createRequestOperateLog(c, {
    logMsg: `用户登录 ${user.username}`,
    logType: 'login',
    method: 'user.login',
    userId: user.id,
  })

  return true
}
