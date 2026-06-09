import type { ServiceContext } from '../../../types'
import type { MenuItem } from '../menu/consts'
import type { RolePolicyInput } from './dto'
import type {
  RoleMenuEntity,
  RolePermissionEntity,
  RolePolicyEntity,
} from './entity'
import { createPlaceholders } from '../../../../utils/common'

const alwaysAllowedAdminPaths = new Set([
  '/admin',
  '/admin/logout',
])

export async function queryRolePermissions(
  ctx: ServiceContext,
  roleIds: number[],
): Promise<RolePermissionEntity[]> {
  return ctx.db.query<RolePermissionEntity>(
    `
      SELECT id, role_id, permission_code, created_at, updated_at
      FROM sys_role_permission
      WHERE role_id IN (${createPlaceholders(roleIds)})
      ORDER BY role_id ASC, permission_code ASC
    `,
    roleIds,
  )
}

export async function queryRoleMenus(
  ctx: ServiceContext,
  roleIds: number[],
): Promise<RoleMenuEntity[]> {
  return ctx.db.query<RoleMenuEntity>(
    `
      SELECT id, role_id, menu_name, created_at, updated_at
      FROM sys_role_menu
      WHERE role_id IN (${createPlaceholders(roleIds)})
      ORDER BY role_id ASC, menu_name ASC
    `,
    roleIds,
  )
}

export async function queryRolePolicies(
  ctx: ServiceContext,
  roleIds: number[],
): Promise<Array<Pick<RolePolicyEntity, 'action_key' | 'method_pattern' | 'path_pattern' | 'role_id'>>> {
  const permissionPolicies = await ctx.db.query<
    Pick<RolePolicyEntity, 'action_key' | 'method_pattern' | 'path_pattern' | 'role_id'>
  >(
    `
      SELECT
        role_permission.role_id AS role_id,
        permission.path_pattern AS path_pattern,
        permission.method_pattern AS method_pattern,
        permission.action_key AS action_key
      FROM sys_role_permission role_permission
      INNER JOIN sys_permission permission
        ON permission.code = role_permission.permission_code
      WHERE role_permission.role_id IN (${createPlaceholders(roleIds)})
      ORDER BY role_permission.role_id ASC, permission.sort_order ASC
    `,
    roleIds,
  )
  const legacyPolicies = await ctx.db.query<
    Pick<RolePolicyEntity, 'action_key' | 'method_pattern' | 'path_pattern' | 'role_id'>
  >(
    `
      SELECT role_id, path_pattern, method_pattern, '*' AS action_key
      FROM sys_role_policy
      WHERE role_id IN (${createPlaceholders(roleIds)})
      ORDER BY role_id ASC, id ASC
    `,
    roleIds,
  )

  return [...permissionPolicies, ...legacyPolicies]
}

export function toRolePolicyInput(
  row: Pick<RolePolicyEntity, 'action_key' | 'method_pattern' | 'path_pattern'>,
): RolePolicyInput {
  return {
    actionKey: row.action_key,
    methodPattern: row.method_pattern as RolePolicyInput['methodPattern'],
    pathPattern: row.path_pattern,
  }
}

export function groupByRoleId<T, V>(
  rows: T[],
  mapper: (row: T) => V,
): Map<number, V[]> {
  const groups = new Map<number, V[]>()

  for (const row of rows) {
    const roleId = (row as { role_id: number }).role_id
    const values = groups.get(roleId) ?? []
    values.push(mapper(row))
    groups.set(roleId, values)
  }

  return groups
}

export function filterMenuTree(
  items: MenuItem[],
  menuNames: Set<string>,
): MenuItem[] {
  const filteredItems: MenuItem[] = []

  for (const item of items) {
    const children = item.children
      ? filterMenuTree(item.children, menuNames)
      : undefined

    if (menuNames.has(item.name) || children?.length) {
      filteredItems.push({
        ...item,
        children,
      })
    }
  }

  return filteredItems
}

export function flattenMenuItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenMenuItems(item.children) : []),
  ])
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

export function uniquePolicies(policies: RolePolicyInput[]): RolePolicyInput[] {
  const seen = new Set<string>()
  const unique: RolePolicyInput[] = []

  for (const policy of policies) {
    const key = `${policy.methodPattern}:${policy.actionKey} ${policy.pathPattern}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    unique.push(policy)
  }

  return unique
}

export function getRequestAction(method: string, actionKey: string): string {
  return getPolicyAction({
    actionKey: actionKey.trim() || '*',
    methodPattern: normalizeMethod(method) as RolePolicyInput['methodPattern'],
    pathPattern: '',
  })
}

export function getPolicyAction(policy: RolePolicyInput): string {
  if (policy.methodPattern === '*') {
    return '*'
  }

  return `${policy.methodPattern}:${policy.actionKey || '*'}`
}

export function isAlwaysAllowedAdminPath(path: string): boolean {
  return alwaysAllowedAdminPaths.has(path)
}

function normalizeMethod(method: string): string {
  const normalizedMethod = method.trim().toUpperCase()
  return normalizedMethod === 'HEAD' ? 'GET' : normalizedMethod
}
