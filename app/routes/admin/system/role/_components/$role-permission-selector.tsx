import type {
  MenuItem,
} from '../../../../../service/admin/system/menu/consts'
import type {
  PermissionRecord,
} from '../../../../../service/admin/system/permission/dto'
import { useMemo, useState } from 'hono/jsx'

type PermissionTab = 'menu' | 'operation'

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
  const [activeTab, setActiveTab] = useState<PermissionTab>('menu')
  const [menuNames, setMenuNames] = useState(selectedMenuNames)
  const [permissionCodes, setPermissionCodes] = useState(selectedPermissionCodes)
  const selectedMenuNameSet = useMemo(() => new Set(menuNames), [menuNames])
  const selectedPermissionCodeSet = useMemo(
    () => new Set(permissionCodes),
    [permissionCodes],
  )

  const toggleMenu = (name: string) => {
    setMenuNames((current) => toggleValue(current, name))
  }

  const togglePermission = (code: string) => {
    setPermissionCodes((current) => toggleValue(current, code))
  }

  return (
    <div class="overflow-x-auto" data-form-field="permissionCodes">
      <div class="tabs tabs-lift">
        <input
          aria-label="菜单权限"
          checked={activeTab === 'menu'}
          class="tab z-1"
          name="role_permission_tabs"
          type="radio"
          value="menu"
          onChange={() => setActiveTab('menu')}
        />
        <div class="sticky start tab-content border-base-300 bg-base-100 p-0">
          <div class="max-h-[48vh] overflow-y-auto p-6">
            <MenuCheckboxes
              items={menus}
              selectedMenuNames={selectedMenuNameSet}
              onCheck={(names) =>
                setMenuNames((current) => addValues(current, names))}
              onInvert={(names) =>
                setMenuNames((current) => invertValues(current, names))}
              onToggle={toggleMenu}
            />
          </div>
        </div>

        <input
          aria-label="操作权限"
          checked={activeTab === 'operation'}
          class="tab z-1"
          name="role_permission_tabs"
          type="radio"
          value="operation"
          onChange={() => setActiveTab('operation')}
        />
        <div class="sticky start tab-content border-base-300 bg-base-100 p-0">
          <div class="max-h-[48vh] overflow-y-auto p-6">
            <PermissionCheckboxes
              permissions={permissions}
              selectedPermissionCodes={selectedPermissionCodeSet}
              onCheck={(codes) =>
                setPermissionCodes((current) => addValues(current, codes))}
              onInvert={(codes) =>
                setPermissionCodes((current) => invertValues(current, codes))}
              onToggle={togglePermission}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuCheckboxes({
  items,
  onCheck,
  onInvert,
  onToggle,
  selectedMenuNames,
}: {
  items: MenuItem[]
  onCheck: (names: string[]) => void
  onInvert: (names: string[]) => void
  onToggle: (name: string) => void
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
                        onCheck={() => onCheck(childNames)}
                        onInvert={() => onInvert(childNames)}
                      />
                    </div>
                    <div class="pl-4">
                      <MenuCheckboxes
                        items={item.children}
                        selectedMenuNames={selectedMenuNames}
                        onCheck={onCheck}
                        onInvert={onInvert}
                        onToggle={onToggle}
                      />
                    </div>
                  </div>
                )
              : (
                  <MenuCheckbox
                    item={item}
                    selected={selectedMenuNames.has(item.name)}
                    onToggle={onToggle}
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
  onToggle,
  selected,
}: {
  item: MenuItem
  onToggle: (name: string) => void
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
        onChange={() => onToggle(item.name)}
      />
      <i class={`${item.icon} shrink-0`}></i>
      <span class="label-text">{item.label}</span>
    </label>
  )
}

function PermissionCheckboxes({
  onCheck,
  onInvert,
  onToggle,
  permissions,
  selectedPermissionCodes,
}: {
  onCheck: (codes: string[]) => void
  onInvert: (codes: string[]) => void
  onToggle: (code: string) => void
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
                onCheck={() => onCheck(codes)}
                onInvert={() => onInvert(codes)}
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
                    onChange={() => onToggle(permission.code)}
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
  onCheck,
  onInvert,
}: {
  label: string
  onCheck: () => void
  onInvert: () => void
}) {
  return (
    <span class="ml-1 flex items-center gap-1">
      <button
        aria-label={`全选${label}`}
        class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-xs font-normal text-primary"
        type="button"
        onClick={onCheck}
      >
        全选
      </button>
      <button
        aria-label={`反选${label}`}
        class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-xs font-normal text-base-content/60"
        type="button"
        onClick={onInvert}
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

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function addValues(values: string[], selectedValues: string[]): string[] {
  return [...new Set([...values, ...selectedValues])]
}

function invertValues(values: string[], selectedValues: string[]): string[] {
  const selectedSet = new Set(selectedValues)
  const currentSet = new Set(values)
  const nextValues = values.filter((value) => !selectedSet.has(value))

  for (const value of selectedValues) {
    if (!currentSet.has(value)) {
      nextValues.push(value)
    }
  }

  return nextValues
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
