import type { RoleOption } from '../../../../../service/admin/system/role/dto'
import type { UserRecord } from '../../../../../service/admin/system/user/dto'
import {
  ConfirmActionModal,
  EditActionModal,
} from '../../../-components/crud-action-modal'
import { returnToFieldName } from '../../../../-/utils/form'
import { UserStatusUtils } from '../../../../../service/admin/system/user/enum'
import { formatDateTime } from '../../../../../utils/datetime'
import UserForm from './user-form'

interface Props {
  listHref: string
  roles: RoleOption[]
  timezone: string
  users: UserRecord[]
}

export default function UserTable({ listHref, roles, timezone, users }: Props) {
  const roleLabels = new Map(roles.map((role) => [role.id, role.name]))

  return (
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>联系信息</th>
            <th>角色 / 状态</th>
            <th>更新时间</th>
            <th class="text-right"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>
                <div class="flex min-w-44 flex-col gap-1">
                  <span class="font-mono font-medium">{user.username}</span>
                  <span class="text-xs text-base-content/55">
                    {user.nickname || '未设置昵称'}
                  </span>
                </div>
              </td>
              <td>
                <div class="flex min-w-56 flex-col gap-1 text-sm">
                  <span>{user.mail || '未绑定邮箱'}</span>
                  <span class="text-base-content/55">
                    {user.phone || '未绑定手机'}
                  </span>
                </div>
              </td>
              <td>
                <div class="flex min-w-40 flex-wrap gap-2">
                  <span class={`badge badge-soft ${user.isRoot ? 'badge-error' : 'badge-info'}`}>
                    {user.isRoot ? 'root' : 'user'}
                  </span>
                  {user.roleIds.length
                    ? user.roleIds.map((roleId) => (
                        <span class="badge badge-soft badge-primary" key={roleId}>
                          {roleLabels.get(roleId) ?? `角色 #${roleId}`}
                        </span>
                      ))
                    : (
                        <span class="badge badge-soft badge-primary">
                          未分配角色
                        </span>
                      )}
                  <span class={`badge badge-soft ${UserStatusUtils.getBadgeClass(user.status)}`}>
                    {UserStatusUtils.getLabel(user.status)}
                  </span>
                </div>
              </td>
              <td>{formatDateTime(user.updatedAt, timezone)}</td>
              <td class="text-right">
                <div class="flex flex-nowrap items-center justify-end gap-2">
                  <EditActionModal
                    buttonLabel="编辑"
                    id={`user-edit-${user.id}`}
                    title={`编辑用户 #${user.id}`}
                  >
                    <UserForm
                      cancelTargetId={`user-edit-${user.id}`}
                      mode="update"
                      returnTo={listHref}
                      roles={roles}
                      user={user}
                    />
                  </EditActionModal>
                  <ConfirmActionModal
                    id={`user-delete-${user.id}`}
                    inputs={[
                      { name: 'intent', value: 'delete' },
                      { name: 'id', value: user.id },
                      { name: returnToFieldName, value: listHref },
                    ]}
                    message={`用户「${user.username}」删除后不可恢复。`}
                    title="删除用户"
                  />
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0
            ? (
                <tr>
                  <td class="text-base-content/60" colspan={6}>
                    暂无用户。
                  </td>
                </tr>
              )
            : null}
        </tbody>
      </table>
    </div>
  )
}
