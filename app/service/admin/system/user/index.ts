import type { PaginatedResult } from '../../../common'
import type { ServiceContext } from '../../../types'
import type {
  CreateUserInput,
  ListUserInput,
  UpdateUserInput,
  UserRecord,
} from './dto'
import type { UserEntity } from './entity'
import { NotFoundError, ValidationError } from '../../../../utils'
import {
  buildKeywordCondition,
  buildWhereClause,
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common'
import { listUserSchema } from './dto'
import { UserStatus } from './enum'

export * from './dto'
export * from './entity'
export * from './enum'

export interface UserCredential {
  activeRoleId?: number | null
  id: number
  isRoot: boolean
  password: string
  roleCode?: string | null
  roleId: number | null
  roleIds?: number[]
  username: string
}

export interface UserSessionRole {
  code: string
  id: number
  name: string
}

export interface UserHeaderProfile {
  activeRoleId: number | null
  avatar: string | null
  id: number
  nickname: string | null
  roles: UserSessionRole[]
  username: string
}

interface UserCredentialEntity {
  id: number
  is_root: number
  password: string
  role_code: string | null
  role_id: number | null
  username: string
}

interface UserHeaderProfileEntity {
  avatar: string | null
  id: number
  nickname: string | null
  username: string
}

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

const userCredentialColumns = `
  "user".id,
  "user".username,
  "user".password,
  "user".is_root,
  "user".role_id,
  role.code AS role_code
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
  ])
  const total = await countUsers(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<UserEntity>(`
    SELECT ${userColumns}
    FROM "user"
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
    rows.map((row) =>
      toUserRecord(row, roleIdsByUserId.get(row.id) ?? getFallbackRoleIds(row.role_id))
    ),
    total,
    pagination,
  )
}

export async function isAdminInstalled(ctx: ServiceContext): Promise<boolean> {
  const row = await ctx.db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM "user" WHERE is_root = 1 AND status = ?',
    [UserStatus.NORMAL],
  )

  return (row?.count ?? 0) > 0
}

export async function createUser(
  ctx: ServiceContext,
  input: CreateUserInput,
): Promise<UserRecord> {
  await assertUsernameAvailable(ctx, input.username)
  if (input.isRoot) {
    await assertCanCreateRoot(ctx)
  }

  const roleIds = await resolveCreateUserRoleIds(ctx, input)
  const roleId = roleIds[0] ?? null
  await assertRolesExist(ctx, roleIds)

  const now = ctx.now()
  const result = await ctx.db.transaction(async (db) => {
    const txCtx = { ...ctx, db }
    const result = await db.execute(
      `
        INSERT INTO "user" (
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

    await replaceUserRoles(txCtx, Number(result.lastInsertId), roleIds)
    return result
  })

  return getUserById(ctx, Number(result.lastInsertId))
}

export async function updateUser(
  ctx: ServiceContext,
  id: number,
  input: UpdateUserInput,
): Promise<UserRecord> {
  const current = await requireUser(ctx, id)
  const nextUsername = input.username ?? current.username
  const shouldUpdateRoles = hasField(input, 'roleIds') || hasField(input, 'roleId')
  const nextRoleIds = shouldUpdateRoles
    ? normalizeRoleIds(input.roleIds, hasField(input, 'roleId') ? input.roleId ?? null : undefined)
    : await listUserRoleIds(ctx, id, current.role_id)
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
        UPDATE "user"
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

    if (shouldUpdateRoles) {
      await replaceUserRoles(txCtx, id, nextRoleIds)
    }
  })

  return getUserById(ctx, id)
}

export async function deleteUser(ctx: ServiceContext, id: number): Promise<void> {
  const current = await requireUser(ctx, id)

  if (current.is_root === 1 && current.status === UserStatus.NORMAL) {
    await assertCanRemoveRoot(ctx, id)
  }

  await ctx.db.transaction(async (db) => {
    await db.execute('DELETE FROM sys_user_role WHERE user_id = ?', [id])
    await db.execute('DELETE FROM "user" WHERE id = ?', [id])
  })
}

export async function getUserCredentialById(
  ctx: ServiceContext,
  id: number,
): Promise<UserCredential | null> {
  const row = await ctx.db.first<UserCredentialEntity>(
    `
      SELECT ${userCredentialColumns}
      FROM "user"
      LEFT JOIN sys_role role
        ON role.id = "user".role_id
      WHERE "user".id = ? AND "user".status = ?
    `,
    [id, UserStatus.NORMAL],
  )

  if (!row) {
    return null
  }

  return toUserCredential(
    row,
    await listUserRoleIds(ctx, row.id, row.role_id),
  )
}

export async function getUserCredentialByUsername(
  ctx: ServiceContext,
  username: string,
): Promise<UserCredential | null> {
  const row = await ctx.db.first<UserCredentialEntity>(
    `
      SELECT ${userCredentialColumns}
      FROM "user"
      LEFT JOIN sys_role role
        ON role.id = "user".role_id
      WHERE "user".username = ? AND "user".status = ?
    `,
    [username, UserStatus.NORMAL],
  )

  if (!row) {
    return null
  }

  return toUserCredential(
    row,
    await listUserRoleIds(ctx, row.id, row.role_id),
  )
}

export async function getUserHeaderProfileById(
  ctx: ServiceContext,
  id: number,
): Promise<UserHeaderProfile | null> {
  const row = await ctx.db.first<UserHeaderProfileEntity>(
    `
      SELECT id, username, nickname, avatar
      FROM "user"
      WHERE id = ? AND status = ?
    `,
    [id, UserStatus.NORMAL],
  )

  return row
    ? toUserHeaderProfile(row, await listUserSessionRoles(ctx, id), null)
    : null
}

export async function listUserSessionRoles(
  ctx: ServiceContext,
  userId: number,
): Promise<UserSessionRole[]> {
  try {
    const roles = await ctx.db.query<UserSessionRole>(
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
    return roles.length ? roles : listUserSessionRolesFromLegacyRole(ctx, userId)
  } catch {
    return listUserSessionRolesFromLegacyRole(ctx, userId)
  }
}

export async function isUserAssignedRole(
  ctx: ServiceContext,
  userId: number,
  roleId: number,
): Promise<boolean> {
  const roleIds = await listUserRoleIds(ctx, userId, null)
  return roleIds.includes(roleId)
}

export async function verifyUserPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const [algorithm, salt, digest] = hashedPassword.split(':')
  if (algorithm !== 'sha256' || !salt || !digest) {
    return false
  }

  return constantTimeEqual(
    await sha256Hex(`${salt}:${password}`),
    digest,
  )
}

async function assertCanRemoveRoot(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const rootCount = await ctx.db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM "user" WHERE is_root = 1 AND status = ?',
    [UserStatus.NORMAL],
  )

  if ((rootCount?.count ?? 0) <= 1) {
    throw new ValidationError('不能移除或禁用最后一个正常 root 用户。', { id })
  }
}

async function assertCanCreateRoot(ctx: ServiceContext): Promise<void> {
  const rootCount = await ctx.db.first<{ count: number }>(
    'SELECT COUNT(*) AS count FROM "user" WHERE is_root = 1',
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
      FROM "user"
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
  return toUserRecord(row, await listUserRoleIds(ctx, id, row.role_id))
}

async function requireUser(ctx: ServiceContext, id: number): Promise<UserEntity> {
  const row = await ctx.db.first<UserEntity>(
    `
      SELECT ${userColumns}
      FROM "user"
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
        'SELECT id FROM "user" WHERE username = ? AND id <> ?',
        [username, exceptId],
      )
    : await ctx.db.first<{ id: number }>(
        'SELECT id FROM "user" WHERE username = ?',
        [username],
      )

  if (row) {
    throw new ValidationError('用户名已存在。', { username })
  }
}

async function listUserRoleIds(
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

async function listUserRoleIdsByUserIds(
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

async function listUserSessionRolesFromLegacyRole(
  ctx: ServiceContext,
  userId: number,
): Promise<UserSessionRole[]> {
  const user = await ctx.db.first<{ role_id: number | null }>(
    'SELECT role_id FROM "user" WHERE id = ?',
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

async function replaceUserRoles(
  ctx: ServiceContext,
  userId: number,
  roleIds: number[],
): Promise<void> {
  const now = ctx.now()

  await ctx.db.execute('DELETE FROM sys_user_role WHERE user_id = ?', [userId])

  for (const roleId of roleIds) {
    await ctx.db.execute(
      `
        INSERT INTO sys_user_role (
          user_id,
          role_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
      [userId, roleId, now, now],
    )
  }
}

function toUserCredential(
  row: UserCredentialEntity,
  roleIds: number[],
): UserCredential {
  return {
    activeRoleId: row.role_id,
    id: row.id,
    isRoot: row.is_root === 1,
    password: row.password,
    roleCode: row.role_code,
    roleId: row.role_id,
    roleIds,
    username: row.username,
  }
}

function toUserHeaderProfile(
  row: UserHeaderProfileEntity,
  roles: UserSessionRole[],
  activeRoleId: number | null,
): UserHeaderProfile {
  return {
    activeRoleId,
    avatar: row.avatar,
    id: row.id,
    nickname: row.nickname,
    roles,
    username: row.username,
  }
}

function toUserRecord(row: UserEntity, roleIds: number[]): UserRecord {
  return {
    avatar: row.avatar,
    bio: row.bio,
    createdAt: row.created_at,
    gender: row.gender,
    id: row.id,
    isRoot: row.is_root === 1,
    mail: row.mail,
    nickname: row.nickname,
    phone: row.phone,
    roleId: row.role_id,
    roleIds,
    status: row.status,
    updatedAt: row.updated_at,
    username: row.username,
  }
}

async function assertRolesExist(
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

function normalizeRoleIds(
  roleIds: number[] | undefined,
  fallbackRoleId: number | null | undefined,
): number[] {
  const values = roleIds ?? getFallbackRoleIds(fallbackRoleId ?? null)
  return [...new Set(values.filter((roleId) => Number.isInteger(roleId) && roleId > 0))]
}

function getFallbackRoleIds(roleId: number | null): number[] {
  return roleId ? [roleId] : []
}

async function resolveCreateUserRoleIds(
  ctx: ServiceContext,
  input: CreateUserInput,
): Promise<number[]> {
  if (input.roleIds || input.roleId) {
    return normalizeRoleIds(input.roleIds, input.roleId)
  }

  return listRoleIdsByCodes(ctx, input.isRoot ? ['admin', 'user'] : ['user'])
}

async function listRoleIdsByCodes(
  ctx: ServiceContext,
  codes: string[],
): Promise<number[]> {
  const rows = await ctx.db.query<{ code: string, id: number }>(
    `
      SELECT id, code
      FROM sys_role
      WHERE code IN (${createPlaceholders(codes)})
    `,
    codes,
  )
  const roleIdsByCode = new Map(rows.map((row) => [row.code, row.id]))

  return codes
    .map((code) => roleIdsByCode.get(code))
    .filter((roleId): roleId is number => typeof roleId === 'number')
}

function createPlaceholders(values: unknown[]): string {
  return values.map(() => '?').join(', ')
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16)
  const digest = await sha256Hex(`${salt}:${password}`)
  return `sha256:${salt}:${digest}`
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(new Uint8Array(hash))
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

function toHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }

  return diff === 0
}

function hasField<T extends object>(
  value: T,
  key: keyof T,
): boolean {
  return Object.hasOwn(value, key)
}
