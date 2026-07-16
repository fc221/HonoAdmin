import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type {
  CreateRoleInput,
  ListRoleInput,
  RoleOption,
  RoleRecord,
  UpdateRoleInput,
} from './dto'
import type { RoleEntity } from './entity'
import { createPlaceholders } from '@hono-admin/utils/common'
import { NotFoundError, ValidationError } from '../../../../utils/errors'
import {
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common/pagination'
import {
  buildKeywordCondition,
  buildWhereClause,
} from '../../../common/query'
import { bumpAdminLayoutCacheVersion } from '../../layout-cache'
import { invalidateRoleAccessCache } from './access'
import {
  groupByRoleId,
  queryRoleMenus,
  queryRolePermissions,
  queryRolePolicies,
  toRolePolicyInput,
  uniqueStrings,
} from './access-helpers'
import { getRoleCatalog, invalidateRoleCatalogCache } from './catalog'
import { createRoleSchema, listRoleSchema, updateRoleSchema } from './dto'

export {
  canAccessAdminPath,
  getDefaultRolePolicies,
  invalidateRoleAccessCache,
  listAuthorizedAdminMenus,
} from './access'

const roleColumns = `
  id,
  code,
  name,
  description,
  created_at,
  updated_at
`

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
      'code',
      'name',
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
  const catalog = await getRoleCatalog(ctx)

  return catalog.map((role) => ({
    code: role.code,
    id: role.id,
    name: role.name,
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
    const roleId = await db.insertAndGetId(
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
    await replaceRoleAccess(txCtx, roleId, parsedInput)
    return getRoleById(txCtx, roleId)
  })

  await invalidateRoleAccessCache(ctx, role.id)
  await invalidateRoleCatalogCache(ctx)
  await bumpAdminLayoutCacheVersion(ctx)
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
  await invalidateRoleCatalogCache(ctx)
  await bumpAdminLayoutCacheVersion(ctx)
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
    'SELECT COUNT(*) AS count FROM sys_user WHERE role_id = ?',
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
  await invalidateRoleCatalogCache(ctx)
  await bumpAdminLayoutCacheVersion(ctx)
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
