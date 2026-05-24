import type {
  MenuItem,
} from '../../../../../service/admin/system/menu/consts'
import type {
  PermissionRecord,
} from '../../../../../service/admin/system/permission/dto'
import type {
  RoleRecord,
} from '../../../../../service/admin/system/role/dto'
import CsrfField from '../../../../-/components/csrf-field'
import { topLevelFormTurboAttrs } from '../../../../-/components/turbo-frame'
import { returnToFieldName } from '../../../../-/utils/form'
import RolePermissionSelector from './role-permission-selector'

interface Props {
  menus: MenuItem[]
  mode: 'create' | 'update'
  permissions: PermissionRecord[]
  returnTo?: string
  role?: RoleRecord
}

export default function RoleForm({
  menus,
  mode,
  permissions,
  returnTo,
  role,
}: Props) {
  const isUpdate = mode === 'update'

  return (
    <form
      class="space-y-5"
      autocomplete="off"
      data-validate-trigger="blur"
      method="post"
      {...topLevelFormTurboAttrs}
    >
      <CsrfField />
      {returnTo ? <input name={returnToFieldName} type="hidden" value={returnTo} /> : null}
      <input name="intent" type="hidden" value={mode} />
      {role ? <input name="id" type="hidden" value={role.id} /> : null}

      <div class="grid gap-4 md:grid-cols-2">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">角色名称</legend>
          <input
            class="input w-full"
            maxlength={60}
            minlength={2}
            name="name"
            placeholder="请输入角色名称"
            required
            value={role?.name ?? ''}
          />
          <p class="label">用于后台展示。</p>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">角色编码</legend>
          <input
            class="input w-full"
            maxlength={40}
            minlength={2}
            name="code"
            pattern="^[A-Za-z0-9_.\-]+$"
            placeholder="admin"
            required
            value={role?.code ?? ''}
          />
          <p class="label">用于权限识别，创建后建议保持稳定。</p>
        </fieldset>

        <fieldset class="fieldset md:col-span-2">
          <legend class="fieldset-legend">角色说明</legend>
          <textarea
            class="textarea min-h-20 w-full"
            maxlength={255}
            name="description"
            placeholder="请输入角色说明"
          >
            {role?.description ?? ''}
          </textarea>
        </fieldset>
      </div>

      <RolePermissionSelector
        menus={menus}
        permissions={permissions}
        selectedMenuNames={role?.menuNames ?? []}
        selectedPermissionCodes={role?.permissionCodes ?? []}
      />

      <div class="flex justify-end gap-2 border-t border-base-300 pt-4">
        <a
          class="btn btn-ghost btn-sm"
          href={returnTo ?? '/admin/system/role'}
        >
          取消
        </a>
        <button class="btn btn-primary btn-sm" type="submit">
          {isUpdate ? '保存修改' : '新增角色'}
        </button>
      </div>
    </form>
  )
}
