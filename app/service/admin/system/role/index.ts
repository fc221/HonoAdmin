import type { SQLParameter } from '../../../../infra/database'
import type { PaginatedResult } from '../../../common'
import type { ServiceContext } from '../../../types'
import type { MenuItem } from '../menu'
import type { UserCredential } from '../user'
import type {
  CreateRoleInput,
  ListRoleInput,
  RoleOption,
  RolePolicyInput,
  RoleRecord,
  UpdateRoleInput,
} from './dto'
import type {
  RoleEntity,
  RoleMenuEntity,
  RolePermissionEntity,
  RolePolicyEntity,
} from './entity'
import { newEnforcer, newModelFromString } from 'casbin'
import { buildCacheKey } from '../../../../infra/cache'
import { NotFoundError, ValidationError } from '../../../../utils'
import {
  buildKeywordCondition,
  buildWhereClause,
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common'
import { adminMenus } from '../menu'
import { createRoleSchema, listRoleSchema, updateRoleSchema } from './dto'

export * from './dto'
export * from './entity'

const adminRbacModel = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && (p.act == "*" || r.act == p.act)
`

const roleColumns = `
  id,
  code,
  name,
  description,
  created_at,
  updated_at
`

const alwaysAllowedAdminPaths = new Set([
  '/admin',
  '/admin/logout',
])

const roleAccessCacheTtlSeconds = 60

interface RoleAccessCache {
  menuNames: string[]
  policies: RolePolicyInput[]
}

export async function listRoles(ctx: ServiceContext): Promise<RoleRecord[]> {
  return listAllRoles(ctx)
}

export async function listPaginatedRoles(
  ctx: ServiceContext,
  input: ListRoleInput = {},
): Promise<PaginatedResult<RoleRecord>> {
  const listInput = listRoleSchema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword, [
      'CAST(id AS TEXT)',
      'code',
      'name',
      'description',
      'created_at',
      'updated_at',
    ]),
  ])
  const total = await countRoles(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<RoleEntity>(`
    SELECT ${roleColumns}
    FROM sys_role
    ${whereClause.sql}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `, [
    ...whereClause.params,
    pagination.pageSize,
    getPaginationOffset(pagination),
  ])

  return createPaginatedResult(
    await hydrateRoleRecords(ctx, rows),
    total,
    pagination,
  )
}

export async function listRoleOptions(
  ctx: ServiceContext,
): Promise<RoleOption[]> {
  const rows = await ctx.db.query<Pick<RoleEntity, 'code' | 'id' | 'name'>>(`
    SELECT id, code, name
    FROM sys_role
    ORDER BY id ASC
  `)

  return rows.map((row) => ({
    code: row.code,
    id: row.id,
    name: row.name,
  }))
}

export async function getRoleById(
  ctx: ServiceContext,
  id: number,
): Promise<RoleRecord> {
  const row = await requireRole(ctx, id)
  const [record] = await hydrateRoleRecords(ctx, [row])
  return record
}

export async function createRole(
  ctx: ServiceContext,
  input: CreateRoleInput,
): Promise<RoleRecord> {
  const parsedInput = createRoleSchema.parse(input)
  await assertRoleCodeAvailable(ctx, parsedInput.code)

  const role = await ctx.db.transaction(async (db) => {
    const txCtx = { ...ctx, db }
    const now = ctx.now()
    const result = await db.execute(
      `
        INSERT INTO sys_role (
          code,
          name,
          description,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        parsedInput.code,
        parsedInput.name,
        parsedInput.description ?? null,
        now,
        now,
      ],
    )
    const roleId = Number(result.lastInsertId)
    await replaceRoleAccess(txCtx, roleId, parsedInput)
    return getRoleById(txCtx, roleId)
  })

  await invalidateRoleAccessCache(ctx, role.id)
  return role
}

export async function updateRole(
  ctx: ServiceContext,
  id: number,
  input: UpdateRoleInput,
): Promise<RoleRecord> {
  const parsedInput = updateRoleSchema.parse(input)
  const current = await requireRole(ctx, id)

  if (parsedInput.code !== current.code) {
    await assertRoleCodeAvailable(ctx, parsedInput.code, id)
  }

  await ctx.db.transaction(async (db) => {
    const txCtx = { ...ctx, db }
    await db.execute(
      `
        UPDATE sys_role
        SET code = ?,
            name = ?,
            description = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [
        parsedInput.code,
        parsedInput.name,
        parsedInput.description ?? null,
        ctx.now(),
        id,
      ],
    )
    await replaceRoleAccess(txCtx, id, parsedInput)
  })

  await invalidateRoleAccessCache(ctx, id)
  return getRoleById(ctx, id)
}

export async function deleteRole(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const current = await requireRole(ctx, id)

  if (current.code === 'admin' || current.code === 'user') {
    throw new ValidationError('内置默认角色不能删除。', { id })
  }

  const assigned = await ctx.db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM "user" WHERE role_id = ?',
    [id],
  )

  if ((assigned?.count ?? 0) > 0) {
    throw new ValidationError('角色已被用户使用，不能删除。', { id })
  }

  await ctx.db.transaction(async (db) => {
    await db.execute('DELETE FROM sys_role_menu WHERE role_id = ?', [id])
    await db.execute('DELETE FROM sys_role_policy WHERE role_id = ?', [id])
    await db.execute('DELETE FROM sys_role_permission WHERE role_id = ?', [id])
    await db.execute('DELETE FROM sys_role WHERE id = ?', [id])
  })

  await invalidateRoleAccessCache(ctx, id)
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

  if (isRootAdminRole(user)) {
    return adminMenus
  }

  if (!user.roleId) {
    return []
  }

  const { menuNames } = await getRoleAccess(ctx, user.roleId)
  return filterMenuTree(adminMenus, new Set(menuNames))
}

export async function getFirstAuthorizedAdminHref(
  ctx: ServiceContext,
  user: UserCredential | null,
): Promise<string> {
  const menus = await listAuthorizedAdminMenus(ctx, user)
  return findFirstMenuHref(menus) ?? '/user/profile'
}

export async function canAccessAdminPath(
  ctx: ServiceContext,
  user: UserCredential,
  path: string,
  method: string,
  actionKey = '*',
): Promise<boolean> {
  if (isRootAdminRole(user) || isAlwaysAllowedAdminPath(path)) {
    return true
  }

  if (!user.roleId) {
    return false
  }

  const { policies } = await getRoleAccess(ctx, user.roleId)
  if (policies.length === 0) {
    return false
  }

  const enforcer = await newEnforcer(newModelFromString(adminRbacModel))
  const subject = getUserSubject(user.id)
  const role = getRoleSubject(user.roleId)

  await enforcer.addRoleForUser(subject, role)
  for (const policy of policies) {
    await enforcer.addPolicy(
      role,
      policy.pathPattern,
      getPolicyAction(policy),
    )
  }

  return enforcer.enforce(subject, path, getRequestAction(method, actionKey))
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

async function hydrateRoleRecords(
  ctx: ServiceContext,
  roles: RoleEntity[],
): Promise<RoleRecord[]> {
  if (roles.length === 0) {
    return []
  }

  const roleIds = roles.map((role) => role.id)
  const [menuRows, permissionRows, policyRows] = await Promise.all([
    queryRoleMenus(ctx, roleIds),
    queryRolePermissions(ctx, roleIds),
    queryRolePolicies(ctx, roleIds),
  ])
  const menusByRoleId = groupByRoleId(menuRows, (row) => row.menu_name)
  const permissionCodesByRoleId = groupByRoleId(
    permissionRows,
    (row) => row.permission_code,
  )
  const policiesByRoleId = groupByRoleId(policyRows, toRolePolicyInput)

  return roles.map((role) => ({
    code: role.code,
    createdAt: role.created_at,
    description: role.description,
    id: role.id,
    menuNames: menusByRoleId.get(role.id) ?? [],
    name: role.name,
    permissionCodes: permissionCodesByRoleId.get(role.id) ?? [],
    policies: policiesByRoleId.get(role.id) ?? [],
    updatedAt: role.updated_at,
  }))
}

async function listAllRoles(ctx: ServiceContext): Promise<RoleRecord[]> {
  const roleRows = await ctx.db.query<RoleEntity>(`
    SELECT ${roleColumns}
    FROM sys_role
    ORDER BY id ASC
  `)

  return hydrateRoleRecords(ctx, roleRows)
}

async function countRoles(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM sys_role
      ${whereSql}
    `,
    params,
  )

  return row?.count ?? 0
}

async function requireRole(
  ctx: ServiceContext,
  id: number,
): Promise<RoleEntity> {
  const row = await ctx.db.first<RoleEntity>(
    `
      SELECT ${roleColumns}
      FROM sys_role
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('角色不存在。', { id })
  }

  return row
}

async function assertRoleCodeAvailable(
  ctx: ServiceContext,
  code: string,
  exceptId?: number,
): Promise<void> {
  const row = exceptId
    ? await ctx.db.first<{ id: number }>(
        'SELECT id FROM sys_role WHERE code = ? AND id <> ?',
        [code, exceptId],
      )
    : await ctx.db.first<{ id: number }>(
        'SELECT id FROM sys_role WHERE code = ?',
        [code],
      )

  if (row) {
    throw new ValidationError('角色编码已存在。', { code })
  }
}

async function assertPermissionCodesExist(
  ctx: ServiceContext,
  permissionCodes: string[],
): Promise<void> {
  if (permissionCodes.length === 0) {
    return
  }

  const rows = await ctx.db.query<{ code: string }>(
    `
      SELECT code
      FROM sys_permission
      WHERE code IN (${createPlaceholders(permissionCodes)})
    `,
    permissionCodes,
  )
  const existingCodes = new Set(rows.map((row) => row.code))
  const missingCode = permissionCodes.find((code) => !existingCodes.has(code))

  if (missingCode) {
    throw new ValidationError('操作权限不存在。', {
      permissionCode: missingCode,
    })
  }
}

async function replaceRoleAccess(
  ctx: ServiceContext,
  roleId: number,
  input: CreateRoleInput | UpdateRoleInput,
): Promise<void> {
  const now = ctx.now()
  const menuNames = uniqueStrings(input.menuNames)
  const permissionCodes = uniqueStrings(input.permissionCodes)

  await assertPermissionCodesExist(ctx, permissionCodes)

  await ctx.db.execute('DELETE FROM sys_role_menu WHERE role_id = ?', [roleId])
  await ctx.db.execute('DELETE FROM sys_role_policy WHERE role_id = ?', [roleId])
  await ctx.db.execute('DELETE FROM sys_role_permission WHERE role_id = ?', [
    roleId,
  ])

  for (const menuName of menuNames) {
    await ctx.db.execute(
      `
        INSERT INTO sys_role_menu (
          role_id,
          menu_name,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
      [roleId, menuName, now, now],
    )
  }

  for (const permissionCode of permissionCodes) {
    await ctx.db.execute(
      `
        INSERT INTO sys_role_permission (
          role_id,
          permission_code,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        roleId,
        permissionCode,
        now,
        now,
      ],
    )
  }
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

async function queryRolePermissions(
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

async function queryRoleMenus(
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

async function queryRolePolicies(
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

function toRolePolicyInput(
  row: Pick<RolePolicyEntity, 'action_key' | 'method_pattern' | 'path_pattern'>,
): RolePolicyInput {
  return {
    actionKey: row.action_key,
    methodPattern: row.method_pattern as RolePolicyInput['methodPattern'],
    pathPattern: row.path_pattern,
  }
}

function groupByRoleId<T, V>(
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

function filterMenuTree(
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

function findFirstMenuHref(items: MenuItem[]): string | null {
  for (const item of items) {
    if (item.href) {
      return item.href
    }

    const childHref = item.children ? findFirstMenuHref(item.children) : null
    if (childHref) {
      return childHref
    }
  }

  return null
}

function flattenMenuItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenMenuItems(item.children) : []),
  ])
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

function uniquePolicies(policies: RolePolicyInput[]): RolePolicyInput[] {
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

function createPlaceholders(values: SQLParameter[]): string {
  return values.map(() => '?').join(', ')
}

function normalizeMethod(method: string): string {
  const normalizedMethod = method.trim().toUpperCase()
  return normalizedMethod === 'HEAD' ? 'GET' : normalizedMethod
}

function getRequestAction(method: string, actionKey: string): string {
  return getPolicyAction({
    actionKey: actionKey.trim() || '*',
    methodPattern: normalizeMethod(method) as RolePolicyInput['methodPattern'],
    pathPattern: '',
  })
}

function getPolicyAction(policy: RolePolicyInput): string {
  if (policy.methodPattern === '*') {
    return '*'
  }

  return `${policy.methodPattern}:${policy.actionKey || '*'}`
}

function isAlwaysAllowedAdminPath(path: string): boolean {
  return alwaysAllowedAdminPaths.has(path)
}

function isRootAdminRole(user: UserCredential): boolean {
  return user.isRoot && (!user.roleCode || user.roleCode === 'admin')
}

function getUserSubject(userId: number): string {
  return `user:${userId}`
}

function getRoleSubject(roleId: number): string {
  return `role:${roleId}`
}
