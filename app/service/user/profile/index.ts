import type {
  OperateLogRecord,
} from '../../admin/system/operate-log/dto'
import type {
  UserCredential,
} from '../../admin/system/user'
import type { UserRecord } from '../../admin/system/user/dto'
import type { PaginatedResult } from '../../common/pagination'
import type { ServiceRequestContext } from '../../types'
import type {
  ListUserProfileOperateLogInput,
  UserPasswordUpdateInput,
  UserProfileUpdateInput,
} from './dto'
import { UnauthorizedError, ValidationError } from '../../../utils/errors'
import { getAdminSessionUser, setAdminSession } from '../../admin/session'
import {
  createRequestOperateLog,
  listOperateLogs,
} from '../../admin/system/operate-log'
import {
  getUserById,
  getUserCredentialById,
  updateUser,
  verifyUserPassword,
} from '../../admin/system/user'
import { updateUserSchema } from '../../admin/system/user/dto'
import {
  listUserProfileOperateLogSchema,
  userPasswordUpdateSchema,
  userProfileUpdateSchema,
} from './dto'

export interface UserProfilePageData {
  logs: PaginatedResult<OperateLogRecord>
  user: UserRecord
}

export async function getCurrentUserProfile(
  c: ServiceRequestContext,
): Promise<UserRecord> {
  const sessionUser = await requireCurrentUserSession(c)
  return getUserById(c, sessionUser.id)
}

export async function getCurrentUserProfilePageData(
  c: ServiceRequestContext,
  input: ListUserProfileOperateLogInput = {},
): Promise<UserProfilePageData> {
  const sessionUser = await requireCurrentUserSession(c)
  const logInput = listUserProfileOperateLogSchema.parse(input)
  const [user, logs] = await Promise.all([
    getUserById(c, sessionUser.id),
    listOperateLogs(c, {
      ...logInput,
      userId: sessionUser.id,
    }),
  ])

  return { logs, user }
}

export async function updateCurrentUserProfile(
  c: ServiceRequestContext,
  input: UserProfileUpdateInput,
): Promise<UserRecord> {
  const sessionUser = await requireCurrentUserSession(c)
  const profileInput = userProfileUpdateSchema.parse(input)
  const user = await updateUser(
    c,
    sessionUser.id,
    updateUserSchema.parse(profileInput),
  )

  await createRequestOperateLog(c, {
    logMsg: '更新个人中心',
    logType: 'updateOne',
    method: 'user.profile.update',
    userId: sessionUser.id,
  })

  return user
}

export async function updateCurrentUserPassword(
  c: ServiceRequestContext,
  input: UserPasswordUpdateInput,
): Promise<void> {
  const sessionUser = await requireCurrentUserSession(c)
  const passwordInput = userPasswordUpdateSchema.parse(input)
  const credential = await getUserCredentialById(c, sessionUser.id)

  if (
    !credential
    || !(await verifyUserPassword(passwordInput.oldPassword, credential.password))
  ) {
    throw new ValidationError('旧密码不正确。', {
      fieldErrors: {
        oldPassword: ['旧密码不正确。'],
      },
    })
  }

  await updateUser(
    c,
    sessionUser.id,
    updateUserSchema.parse({
      password: passwordInput.password,
    }),
  )

  const nextCredential = await getUserCredentialById(c, sessionUser.id)
  if (nextCredential) {
    await setAdminSession(c, nextCredential, true)
  }

  await createRequestOperateLog(c, {
    logMsg: '修改个人密码',
    logType: 'updateOne',
    method: 'user.profile.password',
    userId: sessionUser.id,
  })
}

async function requireCurrentUserSession(
  c: ServiceRequestContext,
): Promise<UserCredential> {
  const sessionUser = await getAdminSessionUser(c)

  if (!sessionUser) {
    throw new UnauthorizedError('用户未登录。')
  }

  return sessionUser
}
