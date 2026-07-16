import type { ServiceContext } from '../../../types'
import type {
  UserHeaderProfile,
  UserSessionRole,
} from './dto'
import type {
  UserCredential,
  UserCredentialEntity,
  UserHeaderProfileEntity,
} from './mappers'
import { buildCacheKey } from '@hono-admin/cache'
import { UserStatus } from './enum'
import {
  toUserCredential,
  toUserHeaderProfile,
} from './mappers'
import {
  ensureEffectiveUserSessionRoles,
  listEffectiveUserRoleIds,
  listUserSessionRolesFromLegacyRole,
} from './role-assignment'

const userCredentialColumns = `
  sys_user.id,
  sys_user.username,
  sys_user.password,
  sys_user.is_root,
  sys_user.role_id,
  role.code AS role_code
`

const adminInstalledCacheKey = buildCacheKey('system', 'admin-installed')

export async function isAdminInstalled(ctx: ServiceContext): Promise<boolean> {
  // 安装完成后此状态恒为 true,而 requireApiSession 在每个受保护请求上都会调用它。
  // 只缓存 true(安装前仍每次实查,以便装好后能立刻检测到),省掉每请求一次 COUNT。
  const cached = await ctx.cache.get<boolean>(adminInstalledCacheKey).catch(() => null)
  if (cached === true) {
    return true
  }

  const row = await ctx.db.first<{ installed: number }>(
    'SELECT 1 AS installed FROM sys_user WHERE is_root = 1 AND status = ? LIMIT 1',
    [UserStatus.NORMAL],
  ).catch(() =>
    ctx.db.first<{ installed: number }>(
      'SELECT 1 AS installed FROM sys_user WHERE is_root = 1 LIMIT 1',
    ),
  )
  const installed = !!row
  if (installed) {
    await ctx.cache
      .set(adminInstalledCacheKey, true, { ttlSeconds: 3600 })
      .catch(() => {})
  }

  return installed
}

export async function getUserCredentialById(
  ctx: ServiceContext,
  id: number,
): Promise<UserCredential | null> {
  const row = await ctx.db.first<UserCredentialEntity>(
    `
      SELECT ${userCredentialColumns}
      FROM sys_user
      LEFT JOIN sys_role role
        ON role.id = sys_user.role_id
      WHERE sys_user.id = ? AND sys_user.status = ?
    `,
    [id, UserStatus.NORMAL],
  )

  if (!row) {
    return null
  }

  return toUserCredential(
    row,
    await listEffectiveUserRoleIds(ctx, row.id, row.role_id, row.is_root === 1),
  )
}

export async function getUserCredentialByUsername(
  ctx: ServiceContext,
  username: string,
): Promise<UserCredential | null> {
  const row = await ctx.db.first<UserCredentialEntity>(
    `
      SELECT ${userCredentialColumns}
      FROM sys_user
      LEFT JOIN sys_role role
        ON role.id = sys_user.role_id
      WHERE sys_user.username = ? AND sys_user.status = ?
    `,
    [username, UserStatus.NORMAL],
  )

  if (!row) {
    return null
  }

  return toUserCredential(
    row,
    await listEffectiveUserRoleIds(ctx, row.id, row.role_id, row.is_root === 1),
  )
}

export async function getUserHeaderProfileById(
  ctx: ServiceContext,
  id: number,
): Promise<UserHeaderProfile | null> {
  const profile = await getUserHeaderIdentityById(ctx, id)
  return profile
    ? toUserHeaderProfile(profile, await listUserSessionRoles(ctx, id), null)
    : null
}

export async function getUserHeaderIdentityById(
  ctx: ServiceContext,
  id: number,
): Promise<UserHeaderProfileEntity | null> {
  const row = await ctx.db.first<UserHeaderProfileEntity>(
    `
      SELECT id, username, nickname, avatar
      FROM sys_user
      WHERE id = ? AND status = ?
    `,
    [id, UserStatus.NORMAL],
  )

  return row ?? null
}

export async function listUserSessionRoles(
  ctx: ServiceContext,
  userId: number,
): Promise<UserSessionRole[]> {
  let roles: UserSessionRole[]

  try {
    roles = await ctx.db.query<UserSessionRole>(
      `
        SELECT
          role.id AS id,
          role.code AS code,
          role.name AS name
        FROM sys_user_role user_role
        INNER JOIN sys_role role
          ON role.id = user_role.role_id
        WHERE user_role.user_id = ?
        ORDER BY user_role.id ASC
      `,
      [userId],
    )
  } catch {
    roles = []
  }

  const assignedRoles = roles.length
    ? roles
    : await listUserSessionRolesFromLegacyRole(ctx, userId)
  return ensureEffectiveUserSessionRoles(ctx, userId, assignedRoles)
}

export async function isUserAssignedRole(
  ctx: ServiceContext,
  userId: number,
  roleId: number,
): Promise<boolean> {
  const roles = await listUserSessionRoles(ctx, userId)
  return roles.some((role) => role.id === roleId)
}
