import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type {
  CreateUserInput,
  ListUserInput,
  UpdateUserInput,
  UserRecord,
} from './dto'
import type { UserEntity } from './entity'
import { hasField } from '@hono-admin/utils/common'
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
import { listUserSchema } from './dto'
import { UserStatus } from './enum'
import { toUserRecord } from './mappers'
import { hashPassword } from './password'
import {
  assertRolesExist,
  ensureEffectiveUserRoleIds,
  ensureRootRoleIds,
  getFallbackRoleIds,
  listEffectiveUserRoleIds,
  listUserRoleIds,
  listUserRoleIdsByUserIds,
  normalizeRoleIds,
  replaceUserRoles,
  resolveCreateUserRoleIds,
} from './role-assignment'

export {
  getUserCredentialById,
  getUserCredentialByUsername,
  getUserHeaderIdentityById,
  getUserHeaderProfileById,
  isAdminInstalled,
  isUserAssignedRole,
  listUserSessionRoles,
} from './credentials'
export type { UserCredential } from './mappers'
export { needsPasswordRehash, verifyUserPassword } from './password'

const userColumns = `
  id,
  username,
  password,
  nickname,
  avatar,
  gender,
  bio,
  is_root,
  mail,
  phone,
  role_id,
  status,
  created_at,
  updated_at
`

export async function listUsers(
  ctx: ServiceContext,
  input: ListUserInput = {},
): Promise<PaginatedResult<UserRecord>> {
  const listInput = listUserSchema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword, [
      'username',
      'nickname',
      'mail',
      'phone',
    ]),
    listInput.roleId
      ? {
          params: [listInput.roleId],
          sql: 'EXISTS (SELECT 1 FROM sys_user_role WHERE user_id = sys_user.id AND role_id = ?)',
        }
      : null,
  ])
  const total = await countUsers(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<UserEntity>(`
    SELECT ${userColumns}
    FROM sys_user
    ${whereClause.sql}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `, [
    ...whereClause.params,
    pagination.pageSize,
    getPaginationOffset(pagination),
  ])
  const roleIdsByUserId = await listUserRoleIdsByUserIds(
    ctx,
    rows.map((row) => row.id),
  )

  return createPaginatedResult(
    await Promise.all(rows.map(async (row) =>
      toUserRecord(
        row,
        await ensureEffectiveUserRoleIds(
          ctx,
          roleIdsByUserId.get(row.id) ?? getFallbackRoleIds(row.role_id),
          row.is_root === 1,
        ),
      )
    )),
    total,
    pagination,
  )
}

export async function createUser(
  ctx: ServiceContext,
  input: CreateUserInput,
): Promise<UserRecord> {
  await assertUsernameAvailable(ctx, input.username)
  if (input.isRoot) {
    await assertCanCreateRoot(ctx)
  }

  const roleIds = input.isRoot
    ? await ensureRootRoleIds(ctx, await resolveCreateUserRoleIds(ctx, input))
    : await resolveCreateUserRoleIds(ctx, input)
  const roleId = roleIds[0] ?? null
  await assertRolesExist(ctx, roleIds)

  const now = ctx.now()
  const userId = await ctx.db.transaction(async (db) => {
    const txCtx = { ...ctx, db }
    const userId = await db.insertAndGetId(
      `
        INSERT INTO sys_user (
          username,
          password,
          nickname,
          avatar,
          gender,
          bio,
          is_root,
          mail,
          phone,
          role_id,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.username,
        await hashPassword(input.password),
        input.nickname ?? null,
        input.avatar ?? null,
        input.gender ?? null,
        input.bio ?? null,
        input.isRoot ? 1 : 0,
        input.mail ?? null,
        input.phone ?? null,
        roleId,
        input.status,
        now,
        now,
      ],
    )

    await replaceUserRoles(txCtx, userId, roleIds)
    return userId
  })

  await bumpAdminLayoutCacheVersion(ctx)
  return getUserById(ctx, userId)
}

export async function updateUser(
  ctx: ServiceContext,
  id: number,
  input: UpdateUserInput,
): Promise<UserRecord> {
  const current = await requireUser(ctx, id)
  const nextUsername = input.username ?? current.username
  const shouldUpdateRoles = hasField(input, 'roleIds') || hasField(input, 'roleId')
  const nextIsRoot = hasField(input, 'isRoot')
    ? input.isRoot === true
    : current.is_root === 1
  const submittedRoleIds = shouldUpdateRoles
    ? normalizeRoleIds(input.roleIds, hasField(input, 'roleId') ? input.roleId ?? null : undefined)
    : await listUserRoleIds(ctx, id, current.role_id)
  const nextRoleIds = nextIsRoot
    ? await ensureRootRoleIds(ctx, submittedRoleIds)
    : submittedRoleIds
  const nextRoleId = nextRoleIds[0] ?? null

  if (nextUsername !== current.username) {
    await assertUsernameAvailable(ctx, nextUsername, id)
  }

  if (
    current.is_root !== 1
    && hasField(input, 'isRoot')
    && input.isRoot === true
  ) {
    throw new ValidationError('不支持通过后台入口新增 root 管理员。', { id })
  }

  await assertRolesExist(ctx, nextRoleIds)

  if (
    current.is_root === 1
    && hasField(input, 'isRoot')
    && input.isRoot === false
    && current.status === UserStatus.NORMAL
  ) {
    await assertCanRemoveRoot(ctx, id)
  }

  if (
    current.is_root === 1
    && current.status === UserStatus.NORMAL
    && input.status === UserStatus.DISABLED
  ) {
    await assertCanRemoveRoot(ctx, id)
  }

  await ctx.db.transaction(async (db) => {
    const txCtx = { ...ctx, db }
    await db.execute(
      `
        UPDATE sys_user
        SET username = ?,
            password = ?,
            nickname = ?,
            avatar = ?,
            gender = ?,
            bio = ?,
            is_root = ?,
            mail = ?,
            phone = ?,
            role_id = ?,
            status = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [
        nextUsername,
        input.password ? await hashPassword(input.password) : current.password,
        hasField(input, 'nickname') ? input.nickname ?? null : current.nickname,
        hasField(input, 'avatar') ? input.avatar ?? null : current.avatar,
        hasField(input, 'gender') ? input.gender ?? null : current.gender,
        hasField(input, 'bio') ? input.bio ?? null : current.bio,
        hasField(input, 'isRoot')
          ? input.isRoot ? 1 : 0
          : current.is_root,
        hasField(input, 'mail') ? input.mail ?? null : current.mail,
        hasField(input, 'phone') ? input.phone ?? null : current.phone,
        nextRoleId,
        hasField(input, 'status') ? input.status ?? UserStatus.NORMAL : current.status,
        ctx.now(),
        id,
      ],
    )

    if (shouldUpdateRoles || nextIsRoot) {
      await replaceUserRoles(txCtx, id, nextRoleIds)
    }
  })

  await bumpAdminLayoutCacheVersion(ctx)
  return getUserById(ctx, id)
}

export async function deleteUser(ctx: ServiceContext, id: number): Promise<void> {
  const current = await requireUser(ctx, id)

  if (current.is_root === 1 && current.status === UserStatus.NORMAL) {
    await assertCanRemoveRoot(ctx, id)
  }

  await ctx.db.transaction(async (db) => {
    await db.execute('DELETE FROM sys_user_role WHERE user_id = ?', [id])
    await db.execute('DELETE FROM sys_user WHERE id = ?', [id])
  })
  await bumpAdminLayoutCacheVersion(ctx)
}

async function assertCanRemoveRoot(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const rootCount = await ctx.db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM sys_user WHERE is_root = 1 AND status = ?',
    [UserStatus.NORMAL],
  )

  if ((rootCount?.count ?? 0) <= 1) {
    throw new ValidationError('不能移除或禁用最后一个正常 root 用户。', { id })
  }
}

async function assertCanCreateRoot(ctx: ServiceContext): Promise<void> {
  const rootCount = await ctx.db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM sys_user WHERE is_root = 1',
  )

  if ((rootCount?.count ?? 0) > 0) {
    throw new ValidationError('不支持通过后台入口新增 root 管理员。')
  }
}

async function countUsers(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM sys_user
      ${whereSql}
    `,
    params,
  )

  return row?.count ?? 0
}

export async function getUserById(
  ctx: ServiceContext,
  id: number,
): Promise<UserRecord> {
  const row = await requireUser(ctx, id)
  return toUserRecord(
    row,
    await listEffectiveUserRoleIds(ctx, id, row.role_id, row.is_root === 1),
  )
}

async function requireUser(ctx: ServiceContext, id: number): Promise<UserEntity> {
  const row = await ctx.db.first<UserEntity>(
    `
      SELECT ${userColumns}
      FROM sys_user
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('用户不存在。', { id })
  }

  return row
}

async function assertUsernameAvailable(
  ctx: ServiceContext,
  username: string,
  exceptId?: number,
): Promise<void> {
  const row = exceptId
    ? await ctx.db.first<{ id: number }>(
        'SELECT id FROM sys_user WHERE username = ? AND id <> ?',
        [username, exceptId],
      )
    : await ctx.db.first<{ id: number }>(
        'SELECT id FROM sys_user WHERE username = ?',
        [username],
      )

  if (row) {
    throw new ValidationError('用户名已存在。', { username })
  }
}
