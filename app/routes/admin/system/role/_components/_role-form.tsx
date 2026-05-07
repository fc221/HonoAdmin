import type {
  MenuItem,
  PermissionRecord,
  RoleRecord,
} from '../../../../../service'

interface Props {
  menus: MenuItem[]
  mode: 'create' | 'update'
  permissions: PermissionRecord[]
  role?: RoleRecord
}

export default function RoleForm({ menus, mode, permissions, role }: Props) {
  const isUpdate = mode === 'update'
  const selectedMenuNames = new Set(role?.menuNames ?? [])
  const selectedPermissionCodes = new Set(role?.permissionCodes ?? [])

  return (
    <form
      class="space-y-5"
      autocomplete="off"
      data-pjax="true"
      data-validate-trigger="blur"
      method="post"
    >
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
            pattern="^[\\w.-]+$"
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

      <div class="overflow-x-auto" data-form-field="permissionCodes">
        <div class="tabs tabs-lift">
          <input
            aria-label="菜单权限"
            checked
            class="tab z-1"
            name="role_permission_tabs"
            type="radio"
            value="menu"
          />
          <div class="sticky start tab-content border-base-300 bg-base-100 p-0">
            <div class="max-h-[48vh] overflow-y-auto p-6">
              <MenuCheckboxes
                items={menus}
                selectedMenuNames={selectedMenuNames}
              />
            </div>
          </div>

          <input
            aria-label="操作权限"
            class="tab z-1"
            name="role_permission_tabs"
            type="radio"
            value="operation"
          />
          <div class="sticky start tab-content border-base-300 bg-base-100 p-0">
            <div class="max-h-[48vh] overflow-y-auto p-6">
              <PermissionCheckboxes
                permissions={permissions}
                selectedPermissionCodes={selectedPermissionCodes}
              />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-base-300 pt-4">
        <a
          class="btn btn-ghost btn-sm"
          data-history-back="true"
          href="/admin/system/role"
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

function MenuCheckboxes({
  items,
  selectedMenuNames,
}: {
  items: MenuItem[]
  selectedMenuNames: Set<string>
}) {
  return (
    <ul class="space-y-3">
      {items.map((item) => (
        <li key={item.name}>
          {item.children?.length
            ? (
                <div class="space-y-2" data-checkbox-group="true">
                  <div class="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <i class={`${item.icon} shrink-0`}></i>
                    <span>{item.label}</span>
                    <CheckboxGroupActions label={item.label} />
                  </div>
                  <div class="pl-4">
                    <MenuCheckboxes
                      items={item.children}
                      selectedMenuNames={selectedMenuNames}
                    />
                  </div>
                </div>
              )
            : (
                <MenuCheckbox item={item} selectedMenuNames={selectedMenuNames} />
              )}
        </li>
      ))}
    </ul>
  )
}

function MenuCheckbox({
  item,
  selectedMenuNames,
}: {
  item: MenuItem
  selectedMenuNames: Set<string>
}) {
  return (
    <label class="label cursor-pointer justify-start gap-3 rounded-box px-2 py-2 hover:bg-base-200">
      <input
        checked={selectedMenuNames.has(item.name)}
        class="checkbox checkbox-primary checkbox-sm"
        data-checkbox-group-item="true"
        name="menuNames"
        type="checkbox"
        value={item.name}
      />
      <i class={`${item.icon} shrink-0`}></i>
      <span class="label-text">{item.label}</span>
      {/* {item.href ? (
        <span class="text-xs text-base-content/45">{item.href}</span>
      ) : null} */}
    </label>
  )
}

function PermissionCheckboxes({
  permissions,
  selectedPermissionCodes,
}: {
  permissions: PermissionRecord[]
  selectedPermissionCodes: Set<string>
}) {
  return (
    <ul class="space-y-3">
      {groupPermissions(permissions).map((group) => (
        <li class="space-y-2" data-checkbox-group="true" key={group.name}>
          <div class="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <i class="icon-[ri--route-line] shrink-0"></i>
            <span>{group.name}</span>
            <CheckboxGroupActions label={group.name} />
          </div>
          <div class="space-y-1 pl-4">
            {group.items.map((permission) => (
              <label
                class="label cursor-pointer justify-start gap-3 rounded-box px-2 py-2 hover:bg-base-200"
                key={permission.code}
              >
                <input
                  checked={selectedPermissionCodes.has(permission.code)}
                  class="checkbox checkbox-primary checkbox-sm"
                  data-checkbox-group-item="true"
                  name="permissionCodes"
                  type="checkbox"
                  value={permission.code}
                />
                {/* <span class="badge badge-ghost font-mono">
                  {getPermissionBadge(permission)}
                </span> */}
                <span class="min-w-24 label-text">{permission.name}</span>
                {/* <span class="truncate font-mono text-xs text-base-content/45">
                  {permission.pathPattern}
                </span> */}
              </label>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

function CheckboxGroupActions({ label }: { label: string }) {
  return (
    <span class="ml-1 flex items-center gap-1">
      <button
        aria-label={`全选${label}`}
        class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-xs font-normal text-primary"
        data-checkbox-group-action="check"
        type="button"
      >
        全选
      </button>
      <button
        aria-label={`反选${label}`}
        class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-xs font-normal text-base-content/60"
        data-checkbox-group-action="invert"
        type="button"
      >
        反选
      </button>
    </span>
  )
}

function groupPermissions(permissions: PermissionRecord[]) {
  const groups = new Map<string, PermissionRecord[]>()

  for (const permission of permissions) {
    const items = groups.get(permission.groupName) ?? []
    items.push(permission)
    groups.set(permission.groupName, items)
  }

  return [...groups.entries()].map(([name, items]) => ({ items, name }))
}
