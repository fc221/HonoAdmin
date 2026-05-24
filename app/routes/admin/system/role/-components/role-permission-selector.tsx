import type {
  MenuItem,
} from '../../../../../service/admin/system/menu/consts'
import type {
  PermissionRecord,
} from '../../../../../service/admin/system/permission/dto'

interface Props {
  menus: MenuItem[]
  permissions: PermissionRecord[]
  selectedMenuNames: string[]
  selectedPermissionCodes: string[]
}

export default function RolePermissionSelector({
  menus,
  permissions,
  selectedMenuNames,
  selectedPermissionCodes,
}: Props) {
  const selectedMenuNameSet = new Set(selectedMenuNames)
  const selectedPermissionCodeSet = new Set(selectedPermissionCodes)

  return (
    <div
      class="overflow-x-auto"
      data-controller="role-permission"
      data-form-field="permissionCodes"
    >
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
              selectedMenuNames={selectedMenuNameSet}
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
              selectedPermissionCodes={selectedPermissionCodeSet}
            />
          </div>
        </div>
      </div>
    </div>
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
      {items.map((item) => {
        const childNames = getMenuLeafNames(item)

        return (
          <li key={item.name}>
            {item.children?.length
              ? (
                  <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <i class={`${item.icon} shrink-0`}></i>
                      <span>{item.label}</span>
                      <CheckboxGroupActions
                        label={item.label}
                        name="menuNames"
                        values={childNames}
                      />
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
                  <MenuCheckbox
                    item={item}
                    selected={selectedMenuNames.has(item.name)}
                  />
                )}
          </li>
        )
      })}
    </ul>
  )
}

function MenuCheckbox({
  item,
  selected,
}: {
  item: MenuItem
  selected: boolean
}) {
  return (
    <label class="label cursor-pointer justify-start gap-3 rounded-box px-2 py-2 hover:bg-base-200">
      <input
        checked={selected}
        class="checkbox checkbox-primary checkbox-sm"
        name="menuNames"
        type="checkbox"
        value={item.name}
      />
      <i class={`${item.icon} shrink-0`}></i>
      <span class="label-text">{item.label}</span>
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
      {groupPermissions(permissions).map((group) => {
        const codes = group.items.map((permission) => permission.code)

        return (
          <li class="space-y-2" key={group.name}>
            <div class="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <i class="icon-[ri--route-line] shrink-0"></i>
              <span>{group.name}</span>
              <CheckboxGroupActions
                label={group.name}
                name="permissionCodes"
                values={codes}
              />
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
                    name="permissionCodes"
                    type="checkbox"
                    value={permission.code}
                  />
                  <span class="min-w-24 label-text">{permission.name}</span>
                </label>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function CheckboxGroupActions({
  label,
  name,
  values,
}: {
  label: string
  name: 'menuNames' | 'permissionCodes'
  values: string[]
}) {
  const dataValues = values.join('\n')

  return (
    <span class="ml-1 flex items-center gap-1">
      <button
        aria-label={`全选${label}`}
        class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-xs font-normal text-primary"
        data-action="role-permission#check"
        data-role-permission-name={name}
        data-role-permission-values={dataValues}
        type="button"
      >
        全选
      </button>
      <button
        aria-label={`反选${label}`}
        class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-xs font-normal text-base-content/60"
        data-action="role-permission#invert"
        data-role-permission-name={name}
        data-role-permission-values={dataValues}
        type="button"
      >
        反选
      </button>
    </span>
  )
}

function getMenuLeafNames(item: MenuItem): string[] {
  if (!item.children?.length) {
    return [item.name]
  }

  return item.children.flatMap(getMenuLeafNames)
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
