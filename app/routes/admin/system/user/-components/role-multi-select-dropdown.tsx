import type { RoleOption } from '../../../../../service/admin/system/role/dto'

interface Props {
  roles: RoleOption[]
  selectedRoleIds: number[]
}

export default function RoleMultiSelectDropdown({
  roles,
  selectedRoleIds,
}: Props) {
  const currentRoleIdSet = new Set(selectedRoleIds)
  const selectedRoles = roles.filter((role) => currentRoleIdSet.has(role.id))
  const summary = selectedRoles.length
    ? selectedRoles.map((role) => role.name).join('、')
    : '请选择角色'

  return (
    <details
      class="dropdown w-full min-w-0 max-w-full"
      data-controller="role-multi-select"
    >
      <summary class="btn btn-outline w-full min-w-0 justify-between font-normal">
        <span class="min-w-0 truncate" data-role-multi-select-target="summary">
          {summary}
        </span>
        <i class="icon-[ri--arrow-down-s-line]" aria-hidden="true" />
      </summary>
      <div class="dropdown-content z-40 mt-2 w-full max-w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
        <div class="max-h-56 overflow-auto">
          {roles.length
            ? roles.map((role) => {
                const checked = currentRoleIdSet.has(role.id)

                return (
                  <label
                    class={getRoleOptionClass(checked)}
                    data-role-id={role.id}
                    data-role-multi-select-target="option"
                    key={role.id}
                  >
                    <input
                      checked={checked}
                      class="checkbox checkbox-primary checkbox-sm"
                      data-action="change->role-multi-select#toggle"
                      data-role-multi-select-target="checkbox"
                      data-role-name={role.name}
                      name="roleIds"
                      type="checkbox"
                      value={role.id}
                    />
                    <span class="min-w-0 flex-1 truncate">{role.name}</span>
                    <span class="badge badge-ghost badge-sm shrink-0">{role.code}</span>
                    <i
                      class={`icon-[ri--check-line] text-primary ${checked ? '' : 'hidden'}`}
                      data-role-id={role.id}
                      data-role-multi-select-target="check"
                    />
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
  const baseClass = 'flex min-w-0 cursor-pointer items-center gap-3 rounded-field px-3 py-2 hover:bg-base-200'
  return checked
    ? `${baseClass} bg-primary/10 text-primary`
    : baseClass
}
