import type { ServiceContext } from '../../../types'
import type { RoleCatalogEntry } from '../role/catalog'
import type { CreateUserInput, UserSessionRole } from './dto'
import { createPlaceholders } from '@hono-admin/utils/common'
import { ValidationError } from '../../../../utils/errors'
import { getRoleCatalog } from '../role/catalog'

export async function listUserRoleIds(
  ctx: ServiceContext,
  userId: number,
  fallbackRoleId: number | null,
): Promise<number[]> {
  try {
    const rows = await ctx.db.query<{ role_id: number }>(
      `
        SELECT role_id
        FROM sys_user_role
        WHERE user_id = ?
        ORDER BY id ASC
      `,
      [userId],
    )
    return rows.length
      ? rows.map((row) => row.role_id)
      : getFallbackRoleIds(fallbackRoleId)
  } catch {
    return getFallbackRoleIds(fallbackRoleId)
  }
}

export async function listEffectiveUserRoleIds(
  ctx: ServiceContext,
  userId: number,
  fallbackRoleId: number | null,
  isRoot: boolean,
): Promise<number[]> {
  return ensureEffectiveUserRoleIds(
    ctx,
    await listUserRoleIds(ctx, userId, fallbackRoleId),
    isRoot,
  )
}

export async function listUserRoleIdsByUserIds(
  ctx: ServiceContext,
  userIds: number[],
): Promise<Map<number, number[]>> {
  const roleIdsByUserId = new Map<number, number[]>()

  if (userIds.length === 0) {
    return roleIdsByUserId
  }

  try {
    const rows = await ctx.db.query<{
      role_id: number
      user_id: number
    }>(
      `
        SELECT user_id, role_id
        FROM sys_user_role
        WHERE user_id IN (${createPlaceholders(userIds)})
        ORDER BY user_id ASC, id ASC
      `,
      userIds,
    )

    for (const row of rows) {
      const roleIds = roleIdsByUserId.get(row.user_id) ?? []
      roleIds.push(row.role_id)
      roleIdsByUserId.set(row.user_id, roleIds)
    }
  } catch {}

  return roleIdsByUserId
}

export async function listUserSessionRolesFromLegacyRole(
  ctx: ServiceContext,
  userId: number,
): Promise<UserSessionRole[]> {
  const user = await ctx.db.first<{ role_id: number | null }>(
    'SELECT role_id FROM sys_user WHERE id = ?',
    [userId],
  )

  if (!user?.role_id) {
    return []
  }

  const role = await ctx.db.first<UserSessionRole>(
    `
      SELECT id, code, name
      FROM sys_role
      WHERE id = ?
    `,
    [user.role_id],
  )

  return role ? [role] : []
}

export async function ensureEffectiveUserSessionRoles(
  ctx: ServiceContext,
  userId: number,
  roles: UserSessionRole[],
): Promise<UserSessionRole[]> {
  if (!await isRootUser(ctx, userId)) {
    return roles
  }

  return mergeSessionRoles(
    await listUserSessionRolesByCodes(ctx, ['admin', 'user']),
    roles,
  )
}

export async function replaceUserRoles(
  ctx: ServiceContext,
  userId: number,
  roleIds: number[],
): Promise<void> {
  const now = ctx.now()

  await ctx.db.execute('DELETE FROM sys_user_role WHERE user_id = ?', [userId])

  if (roleIds.length > 0) {
    await ctx.db.batch(
      roleIds.map((roleId) => ({
        sql: `
          INSERT INTO sys_user_role (
            user_id,
            role_id,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?)
        `,
        params: [userId, roleId, now, now],
      })),
    )
  }
}

export async function assertRolesExist(
  ctx: ServiceContext,
  roleIds: number[],
): Promise<void> {
  if (roleIds.length === 0) {
    return
  }

  const rows = await ctx.db.query<{ id: number }>(
    `
      SELECT id
      FROM sys_role
      WHERE id IN (${createPlaceholders(roleIds)})
    `,
    roleIds,
  )
  const existingRoleIds = new Set(rows.map((row) => row.id))
  const missingRoleId = roleIds.find((roleId) => !existingRoleIds.has(roleId))

  if (missingRoleId) {
    throw new ValidationError('角色不存在。', { roleId: missingRoleId })
  }
}

export function normalizeRoleIds(
  roleIds: number[] | undefined,
  fallbackRoleId: number | null | undefined,
): number[] {
  const values = roleIds ?? getFallbackRoleIds(fallbackRoleId ?? null)
  return [...new Set(values.filter((roleId) => Number.isInteger(roleId) && roleId > 0))]
}

export function getFallbackRoleIds(roleId: number | null): number[] {
  return roleId ? [roleId] : []
}

export async function resolveCreateUserRoleIds(
  ctx: ServiceContext,
  input: CreateUserInput,
): Promise<number[]> {
  if (input.roleIds || input.roleId) {
    return normalizeRoleIds(input.roleIds, input.roleId)
  }

  return listRoleIdsByCodes(ctx, input.isRoot ? ['admin', 'user'] : ['user'])
}

export async function ensureRootRoleIds(
  ctx: ServiceContext,
  roleIds: number[],
): Promise<number[]> {
  return ensureEffectiveUserRoleIds(ctx, roleIds, true)
}

export async function ensureEffectiveUserRoleIds(
  ctx: ServiceContext,
  roleIds: number[],
  isRoot: boolean,
): Promise<number[]> {
  if (!isRoot) {
    return roleIds
  }

  return [...new Set([
    ...await listRoleIdsByCodes(ctx, ['admin', 'user']),
    ...roleIds,
  ])]
}

async function isRootUser(
  ctx: ServiceContext,
  userId: number,
): Promise<boolean> {
  const row = await ctx.db.first<{ is_root: number }>(
    'SELECT is_root FROM sys_user WHERE id = ?',
    [userId],
  )

  return row?.is_root === 1
}

async function listRoleIdsByCodes(
  ctx: ServiceContext,
  codes: string[],
): Promise<number[]> {
  const catalog = await getRoleCatalog(ctx)
  const roleIdsByCode = new Map(catalog.map((role) => [role.code, role.id]))

  return codes
    .map((code) => roleIdsByCode.get(code))
    .filter((roleId): roleId is number => typeof roleId === 'number')
}

async function listUserSessionRolesByCodes(
  ctx: ServiceContext,
  codes: string[],
): Promise<UserSessionRole[]> {
  const catalog = await getRoleCatalog(ctx)
  const rolesByCode = new Map(catalog.map((role) => [role.code, role]))

  return codes
    .map((code) => rolesByCode.get(code))
    .filter((role): role is RoleCatalogEntry => !!role)
    .map((role) => ({ code: role.code, id: role.id, name: role.name }))
}

function mergeSessionRoles(
  primaryRoles: UserSessionRole[],
  secondaryRoles: UserSessionRole[],
): UserSessionRole[] {
  const mergedRoles: UserSessionRole[] = []
  const seenRoleIds = new Set<number>()

  for (const role of [...primaryRoles, ...secondaryRoles]) {
    if (seenRoleIds.has(role.id)) {
      continue
    }

    seenRoleIds.add(role.id)
    mergedRoles.push(role)
  }

  return mergedRoles
}
