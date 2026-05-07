import type { ServiceRequestContext } from '../types'
import { z } from 'zod'
import { setAdminSession } from '../admin/session'
import { createRequestOperateLog } from '../admin/system/operate-log'
import {
  getUserCredentialById,
  getUserCredentialByUsername,
  needsPasswordRehash,
  updateUser,
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

  const sessionUser = await updatePasswordHashIfNeeded(
    c,
    user,
    loginInput.password,
  )
  await setAdminSession(c, sessionUser, loginInput.remember)
  await createRequestOperateLog(c, {
    logMsg: `用户登录 ${user.username}`,
    logType: 'login',
    method: 'user.login',
    userId: user.id,
  })

  return true
}

async function updatePasswordHashIfNeeded(
  c: ServiceRequestContext,
  user: NonNullable<Awaited<ReturnType<typeof getUserCredentialByUsername>>>,
  password: string,
) {
  if (!needsPasswordRehash(user.password)) {
    return user
  }

  await updateUser(c, user.id, { password })
  return await getUserCredentialById(c, user.id) ?? user
}
