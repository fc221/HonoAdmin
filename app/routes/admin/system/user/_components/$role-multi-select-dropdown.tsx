import type { RoleOption } from '../../../../../service'
import { useMemo, useState } from 'hono/jsx'

interface Props {
  roles: RoleOption[]
  selectedRoleIds: number[]
}

export default function RoleMultiSelectDropdown({
  roles,
  selectedRoleIds,
}: Props) {
  const [currentRoleIds, setCurrentRoleIds] = useState(selectedRoleIds)
  const currentRoleIdSet = useMemo(
    () => new Set(currentRoleIds),
    [currentRoleIds],
  )
  const selectedRoles = roles.filter((role) => currentRoleIdSet.has(role.id))
  const summary = selectedRoles.length
    ? selectedRoles.map((role) => role.name).join('、')
    : '请选择角色'

  const toggleRole = (roleId: number) => {
    setCurrentRoleIds((roleIds) =>
      roleIds.includes(roleId)
        ? roleIds.filter((id) => id !== roleId)
        : [...roleIds, roleId]
    )
  }

  return (
    <details class="dropdown w-full">
      <summary class="btn btn-outline w-full justify-between font-normal">
        <span class="truncate">{summary}</span>
        <i class="icon-[ri--arrow-down-s-line]" aria-hidden="true" />
      </summary>
      <div class="dropdown-content z-40 mt-2 w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
        <div class="max-h-56 overflow-auto">
          {roles.length
            ? roles.map((role) => {
                const checked = currentRoleIdSet.has(role.id)

                return (
                  <label
                    class={getRoleOptionClass(checked)}
                    key={role.id}
                  >
                    <input
                      checked={checked}
                      class="checkbox checkbox-primary checkbox-sm"
                      name="roleIds"
                      type="checkbox"
                      value={role.id}
                      onChange={() => toggleRole(role.id)}
                    />
                    <span class="min-w-0 flex-1 truncate">{role.name}</span>
                    <span class="badge badge-ghost badge-sm">{role.code}</span>
                    {checked
                      ? <i class="icon-[ri--check-line] text-primary" />
                      : null}
                  </label>
                )
              })
            : (
                <div class="px-3 py-2 text-sm text-base-content/60">
                  暂无角色可选
                </div>
              )}
        </div>
      </div>
    </details>
  )
}

function getRoleOptionClass(checked: boolean): string {
  const baseClass = 'flex cursor-pointer items-center gap-3 rounded-field px-3 py-2 hover:bg-base-200'
  return checked
    ? `${baseClass} bg-primary/10 text-primary`
    : baseClass
}
