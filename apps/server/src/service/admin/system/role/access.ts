import type { ServiceContext } from '../../../types'
import type { MenuItem } from '../menu/consts'
import type { UserCredential } from '../user'
import type { RolePolicyInput } from './dto'
import type { RoleMenuEntity } from './entity'
import { buildCacheKey } from '@hono-admin/cache'
import { adminMenus } from '../menu/consts'
import {
  filterMenuTree,
  flattenMenuItems,
  getPolicyAction,
  getRequestAction,
  isAlwaysAllowedAdminPath,
  queryRolePolicies,
  toRolePolicyInput,
  uniquePolicies,
} from './access-helpers'

const roleAccessCacheTtlSeconds = 60

interface RoleAccessCache {
  menuNames: string[]
  policies: RolePolicyInput[]
}

export async function invalidateRoleAccessCache(
  ctx: ServiceContext,
  roleId: number,
): Promise<void> {
  try {
    await ctx.cache.delete(getRoleAccessCacheKey(roleId))
  } catch {
    // Permission data is still persisted in SQL; cache invalidation is best-effort.
  }
}

export async function listAuthorizedAdminMenus(
  ctx: ServiceContext,
  user: UserCredential | null,
): Promise<MenuItem[]> {
  if (!user) {
    return []
  }

  if (user.isRoot) {
    return adminMenus
  }

  if (!user.roleId) {
    return []
  }

  const { menuNames } = await getRoleAccess(ctx, user.roleId)
  return filterMenuTree(adminMenus, new Set(menuNames))
}

export async function canAccessAdminPath(
  ctx: ServiceContext,
  user: UserCredential,
  path: string,
  method: string,
  actionKey = '*',
): Promise<boolean> {
  if (isAlwaysAllowedAdminPath(path)) {
    return true
  }

  if (!user.isRoot && !user.roleId) {
    return false
  }

  if (user.isRoot) {
    return true
  }

  const { policies } = await getRoleAccess(ctx, user.roleId!)
  if (policies.length === 0) {
    return false
  }

  const requestAction = getRequestAction(method, actionKey)

  for (const policy of policies) {
    if (pathMatchesKey2(path, policy.pathPattern)) {
      const policyAction = getPolicyAction(policy)
      if (policyAction === '*' || policyAction === requestAction) {
        return true
      }
    }
  }

  return false
}

/** Casbin keyMatch2 equivalent: matches RESTful path patterns.
 *  `/foo/*` matches `/foo/anything`, `/:param` matches `/value`. */
function pathMatchesKey2(path: string, pattern: string): boolean {
  let p = pattern.replace(/\/\*/g, '/.*')
  // Replace /:param segments with the regex token for any non-slash value (keyMatch2 semantics)
  p = p.replace(/\/:[^/]+/g, '/[^/]+')
  if (p === '*') {
    p = '(.*)'
  }
  return new RegExp(`^${p}$`).test(path)
}

export function getDefaultRolePolicies(menuNames: string[]): RolePolicyInput[] {
  const policies: RolePolicyInput[] = []
  const menuItems = flattenMenuItems(adminMenus)
  const selectedMenuNames = new Set(menuNames)

  for (const item of menuItems) {
    if (!item.href || !selectedMenuNames.has(item.name)) {
      continue
    }

    policies.push(
      { actionKey: '*', methodPattern: 'GET', pathPattern: item.href },
      { actionKey: '*', methodPattern: 'GET', pathPattern: `${item.href}/*` },
      { actionKey: '*', methodPattern: 'POST', pathPattern: item.href },
      { actionKey: '*', methodPattern: 'POST', pathPattern: `${item.href}/*` },
    )
  }

  return uniquePolicies(policies)
}

async function listRoleMenuNames(
  ctx: ServiceContext,
  roleId: number,
): Promise<string[]> {
  const rows = await ctx.db.query<Pick<RoleMenuEntity, 'menu_name'>>(
    `
      SELECT menu_name
      FROM sys_role_menu
      WHERE role_id = ?
      ORDER BY menu_name ASC
    `,
    [roleId],
  )

  return rows.map((row) => row.menu_name)
}

async function listRolePolicies(
  ctx: ServiceContext,
  roleId: number,
): Promise<RolePolicyInput[]> {
  const rows = await queryRolePolicies(ctx, [roleId])
  return rows.map(toRolePolicyInput)
}

async function getRoleAccess(
  ctx: ServiceContext,
  roleId: number,
): Promise<RoleAccessCache> {
  const cached = await readRoleAccessCache(ctx, roleId)
  if (cached) {
    return cached
  }

  const [menuNames, policies] = await Promise.all([
    listRoleMenuNames(ctx, roleId),
    listRolePolicies(ctx, roleId),
  ])
  const access: RoleAccessCache = { menuNames, policies }

  try {
    await ctx.cache.set(getRoleAccessCacheKey(roleId), access, {
      ttlSeconds: roleAccessCacheTtlSeconds,
    })
  } catch {
    // Access checks should fall back to SQL if an optional cache backend fails.
  }

  return access
}

async function readRoleAccessCache(
  ctx: ServiceContext,
  roleId: number,
): Promise<RoleAccessCache | null> {
  try {
    const cached = await ctx.cache.get<RoleAccessCache>(
      getRoleAccessCacheKey(roleId),
    )

    return isRoleAccessCache(cached) ? cached : null
  } catch {
    return null
  }
}

function getRoleAccessCacheKey(roleId: number): string {
  return buildCacheKey('system', 'role-access', roleId)
}

function isRoleAccessCache(value: unknown): value is RoleAccessCache {
  if (!value || typeof value !== 'object') {
    return false
  }

  const cache = value as Partial<RoleAccessCache>
  return (
    Array.isArray(cache.menuNames)
    && cache.menuNames.every((menuName) => typeof menuName === 'string')
    && Array.isArray(cache.policies)
    && cache.policies.every(isRolePolicyInput)
  )
}

function isRolePolicyInput(value: unknown): value is RolePolicyInput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const policy = value as Partial<RolePolicyInput>
  return (
    typeof policy.actionKey === 'string'
    && typeof policy.methodPattern === 'string'
    && typeof policy.pathPattern === 'string'
  )
}
