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
  id: number
  isRoot: boolean
  password: string
  roleId: number | null
  username: string
}

export interface UserHeaderProfile {
  avatar: string | null
  id: number
  nickname: string | null
  username: string
}

interface UserCredentialEntity {
  id: number
  is_root: number
  password: string
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
  id,
  username,
  password,
  is_root,
  role_id
`

export async function listUsers(
  ctx: ServiceContext,
  input: ListUserInput = {},
): Promise<PaginatedResult<UserRecord>> {
  const listInput = listUserSchema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword, [
      'CAST(id AS TEXT)',
      'username',
      'nickname',
      'avatar',
      'gender',
      'bio',
      'mail',
      'phone',
      'status',
      'created_at',
      'updated_at',
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

  return createPaginatedResult(
    rows.map(toUserRecord),
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

  const roleId = input.roleId ?? (input.isRoot ? 1 : 2)
  await assertRoleExists(ctx, roleId)

  const now = ctx.now()
  const result = await ctx.db.execute(
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

  return getUserById(ctx, Number(result.lastInsertId))
}

export async function updateUser(
  ctx: ServiceContext,
  id: number,
  input: UpdateUserInput,
): Promise<UserRecord> {
  const current = await requireUser(ctx, id)
  const nextUsername = input.username ?? current.username
  const nextRoleId = hasField(input, 'roleId') ? input.roleId ?? null : current.role_id

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

  await assertRoleExists(ctx, nextRoleId)

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

  await ctx.db.execute(
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

  return getUserById(ctx, id)
}

export async function deleteUser(ctx: ServiceContext, id: number): Promise<void> {
  const current = await requireUser(ctx, id)

  if (current.is_root === 1 && current.status === UserStatus.NORMAL) {
    await assertCanRemoveRoot(ctx, id)
  }

  await ctx.db.execute('DELETE FROM "user" WHERE id = ?', [id])
}

export async function getUserCredentialById(
  ctx: ServiceContext,
  id: number,
): Promise<UserCredential | null> {
  const row = await ctx.db.first<UserCredentialEntity>(
    `
      SELECT ${userCredentialColumns}
      FROM "user"
      WHERE id = ? AND status = ?
    `,
    [id, UserStatus.NORMAL],
  )

  return row ? toUserCredential(row) : null
}

export async function getUserCredentialByUsername(
  ctx: ServiceContext,
  username: string,
): Promise<UserCredential | null> {
  const row = await ctx.db.first<UserCredentialEntity>(
    `
      SELECT ${userCredentialColumns}
      FROM "user"
      WHERE username = ? AND status = ?
    `,
    [username, UserStatus.NORMAL],
  )

  return row ? toUserCredential(row) : null
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

  return row ? toUserHeaderProfile(row) : null
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
  return toUserRecord(row)
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

function toUserCredential(row: UserCredentialEntity): UserCredential {
  return {
    id: row.id,
    isRoot: row.is_root === 1,
    password: row.password,
    roleId: row.role_id,
    username: row.username,
  }
}

function toUserHeaderProfile(row: UserHeaderProfileEntity): UserHeaderProfile {
  return {
    avatar: row.avatar,
    id: row.id,
    nickname: row.nickname,
    username: row.username,
  }
}

function toUserRecord(row: UserEntity): UserRecord {
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
    status: row.status,
    updatedAt: row.updated_at,
    username: row.username,
  }
}

async function assertRoleExists(
  ctx: ServiceContext,
  roleId: number | null | undefined,
): Promise<void> {
  if (!roleId) {
    return
  }

  const row = await ctx.db.first<{ id: number }>(
    'SELECT id FROM sys_role WHERE id = ?',
    [roleId],
  )

  if (!row) {
    throw new ValidationError('角色不存在。', { roleId })
  }
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
