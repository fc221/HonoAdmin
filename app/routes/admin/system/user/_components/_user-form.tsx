import type { RoleOption, UserRecord } from '../../../../../service'
import { UserStatus, userStatusOptions } from '../../../../../service'
import FileUploadField from '../../../../_components/_file-upload-field'

interface Props {
  cancelTargetId?: string
  mode: 'create' | 'update'
  roles: RoleOption[]
  user?: UserRecord
}

export default function UserForm({ cancelTargetId, mode, roles, user }: Props) {
  const isUpdate = mode === 'update'
  const defaultRoleId = isUpdate
    ? null
    : (roles.find((role) => role.code === 'user')?.id ?? null)
  const selectedRoleId = user?.roleId ?? defaultRoleId

  return (
    <form
      class="grid gap-4 md:grid-cols-2"
      data-pjax="true"
      data-validate-trigger="blur"
      method="post"
    >
      <input name="intent" type="hidden" value={mode} />
      {user ? <input name="id" type="hidden" value={user.id} /> : null}

      <div class="space-y-2" data-form-field="roleId">
        <FieldLabel label="角色" />
        <select class="select w-full" name="roleId">
          <option selected={!selectedRoleId} value="">
            不分配角色
          </option>
          {roles.map((role) => (
            <option
              key={role.id}
              selected={selectedRoleId === role.id}
              value={role.id}
            >
              {role.name}
            </option>
          ))}
        </select>
        <p class="label">非 root 用户依赖角色获得菜单和操作权限。</p>
      </div>

      <FileUploadField
        label="头像 URL"
        name="avatar"
        uploadType="avatar"
        value={user?.avatar}
      />

      <div class="space-y-2" data-form-field="username">
        <FieldLabel label="用户名" />
        <input
          autocomplete="username"
          class="input w-full"
          maxlength={40}
          minlength={3}
          name="username"
          pattern="^[\\w.-]+$"
          placeholder="请输入用户名"
          required
          value={user?.username ?? ''}
        />
        <p class="label">用于登录和后台识别，创建后仍可编辑。</p>
      </div>

      <div class="space-y-2" data-form-field="nickname">
        <FieldLabel label="昵称" />
        <input
          class="input w-full"
          maxlength={80}
          name="nickname"
          placeholder="请输入昵称"
          value={user?.nickname ?? ''}
        />
        <p class="label">列表和个人资料中展示的名称。</p>
      </div>

      <div class="space-y-2" data-form-field="mail">
        <FieldLabel label="邮箱" />
        <input
          autocomplete="email"
          class="input w-full"
          maxlength={255}
          name="mail"
          placeholder="name@example.com"
          type="email"
          value={user?.mail ?? ''}
        />
        <p class="label">可选，留空表示未绑定邮箱。</p>
      </div>

      <div class="space-y-2" data-form-field="phone">
        <FieldLabel label="手机" />
        <input
          autocomplete="tel"
          class="input w-full"
          maxlength={30}
          name="phone"
          placeholder="请输入手机号"
          type="tel"
          value={user?.phone ?? ''}
        />
        <p class="label">可选，留空表示未绑定手机。</p>
      </div>

      <div class="space-y-2" data-form-field="password">
        <FieldLabel label="密码" />
        <input
          autocomplete="new-password"
          class="input w-full"
          maxlength={128}
          minlength={6}
          name="password"
          placeholder={isUpdate ? '留空表示不修改' : '请输入密码'}
          required={!isUpdate}
          type="password"
        />
        <p class="label">
          {isUpdate ? '编辑时留空则保持原密码。' : '新用户必须设置初始密码。'}
        </p>
      </div>

      <div class="space-y-2" data-form-field="status">
        <FieldLabel label="状态" />
        <select class="select w-full" name="status">
          {userStatusOptions.map((option) => (
            <option
              key={option.value}
              selected={(user?.status ?? UserStatus.NORMAL) === option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <p class="label">禁用用户无法登录后台。</p>
      </div>

      <div class="modal-action md:col-span-2 border-t border-base-300 pt-4">
        {cancelTargetId
          ? (
              <label
                class="btn btn-ghost btn-sm"
                for={cancelTargetId}
                role="button"
                tabindex={0}
              >
                取消
              </label>
            )
          : null}
        <button class="btn btn-primary btn-sm" type="submit">
          {isUpdate ? '保存修改' : '新增用户'}
        </button>
      </div>
    </form>
  )
}

function FieldLabel({ label }: { label: string }) {
  return <span class="block text-sm font-medium">{label}</span>
}
