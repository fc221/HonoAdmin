import type { ServiceRequestContext } from '../types'
import { z } from 'zod'
import { UnauthorizedError, ValidationError } from '../../utils/errors'
import {
  getAdminSessionUser,
  setSessionActiveRole,
} from '../admin/session'
import { createRequestOperateLog } from '../admin/system/operate-log'
import { getFirstAuthorizedAdminHref } from '../admin/system/role'
import {
  isUserAssignedRole,
  listUserSessionRoles,
} from '../admin/system/user'

export const switchSessionRoleSchema = z.object({
  roleId: z.coerce.number().int().positive('请选择有效角色。'),
})

export type SwitchSessionRoleInput = z.input<
  typeof switchSessionRoleSchema
>

export interface SwitchSessionRoleResult {
  message: string
  roleId: number
  target: string
}

export async function switchCurrentSessionRole(
  c: ServiceRequestContext,
  input: SwitchSessionRoleInput,
): Promise<SwitchSessionRoleResult> {
  const sessionUser = await getAdminSessionUser(c)

  if (!sessionUser) {
    throw new UnauthorizedError('用户未登录。')
  }

  const { roleId } = switchSessionRoleSchema.parse(input)

  if (!await isUserAssignedRole(c, sessionUser.id, roleId)) {
    throw new ValidationError('当前账号未绑定该角色。')
  }

  const roles = await listUserSessionRoles(c, sessionUser.id)
  const role = roles.find((role) => role.id === roleId)
  if (!role) {
    throw new ValidationError('角色不存在。', { roleId })
  }

  setSessionActiveRole(c, roleId)
  const targetCredential = {
    ...sessionUser,
    activeRoleId: roleId,
    roleCode: role.code,
    roleId,
    roleIds: roles.map((role) => role.id),
  }
  const adminHref = await getFirstAuthorizedAdminHref(c, targetCredential)
  const target = isUserSideRole(role.code) || !adminHref.startsWith('/admin')
    ? '/user/profile'
    : adminHref

  await createRequestOperateLog(c, {
    logMsg: `切换角色为 ${role.name}`,
    logType: 'operation',
    method: 'user.role-switch',
    userId: sessionUser.id,
  })

  return {
    message: `已切换到${role.name}。`,
    roleId,
    target,
  }
}

function isUserSideRole(roleCode: string): boolean {
  return roleCode === 'user'
}
