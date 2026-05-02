import type { DBAdapter } from '../../infra/database'
import type { UserEntity } from '../entity'
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
} from './schemas'
import { NotFoundError, ValidationError } from '../../utils'

export async function listUsers(db: DBAdapter): Promise<UserRecord[]> {
  const rows = await db.query<UserEntity>(`
    SELECT id, username, password, nickname, avatar, is_root, created_at, updated_at
    FROM admin_users
    ORDER BY id ASC
  `)

  return rows.map(toUserRecord)
}

export async function createUser(
  db: DBAdapter,
  input: CreateUserInput,
  now: string,
): Promise<UserRecord> {
  await assertUsernameAvailable(db, input.username)

  const result = await db.execute(
    `
      INSERT INTO admin_users (
        username,
        password,
        nickname,
        avatar,
        is_root,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.username,
      await hashPassword(input.password),
      input.nickname ?? null,
      input.avatar ?? null,
      input.isRoot ? 1 : 0,
      now,
      now,
    ],
  )

  return getUserById(db, Number(result.lastInsertId))
}

export async function updateUser(
  db: DBAdapter,
  id: number,
  input: UpdateUserInput,
  now: string,
): Promise<UserRecord> {
  const current = await requireUser(db, id)
  const nextUsername = input.username ?? current.username

  if (nextUsername !== current.username) {
    await assertUsernameAvailable(db, nextUsername, id)
  }

  await db.execute(
    `
      UPDATE admin_users
      SET username = ?,
          password = ?,
          nickname = ?,
          avatar = ?,
          is_root = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [
      nextUsername,
      input.password ? await hashPassword(input.password) : current.password,
      hasField(input, 'nickname') ? input.nickname ?? null : current.nickname,
      hasField(input, 'avatar') ? input.avatar ?? null : current.avatar,
      hasField(input, 'isRoot')
        ? input.isRoot ? 1 : 0
        : current.is_root,
      now,
      id,
    ],
  )

  return getUserById(db, id)
}

export async function deleteUser(db: DBAdapter, id: number): Promise<void> {
  const current = await requireUser(db, id)

  if (current.is_root === 1) {
    const rootCount = await db.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM admin_users WHERE is_root = 1',
    )

    if ((rootCount?.count ?? 0) <= 1) {
      throw new ValidationError('不能删除最后一个 root 用户。', { id })
    }
  }

  await db.execute('DELETE FROM admin_users WHERE id = ?', [id])
}

async function getUserById(db: DBAdapter, id: number): Promise<UserRecord> {
  const row = await requireUser(db, id)
  return toUserRecord(row)
}

async function requireUser(db: DBAdapter, id: number): Promise<UserEntity> {
  const row = await db.first<UserEntity>(
    `
      SELECT id, username, password, nickname, avatar, is_root, created_at, updated_at
      FROM admin_users
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
  db: DBAdapter,
  username: string,
  exceptId?: number,
): Promise<void> {
  const row = exceptId
    ? await db.first<UserEntity>(
        'SELECT id, username, password, nickname, avatar, is_root, created_at, updated_at FROM admin_users WHERE username = ? AND id <> ?',
        [username, exceptId],
      )
    : await db.first<UserEntity>(
        'SELECT id, username, password, nickname, avatar, is_root, created_at, updated_at FROM admin_users WHERE username = ?',
        [username],
      )

  if (row) {
    throw new ValidationError('用户名已存在。', { username })
  }
}

function toUserRecord(row: UserEntity): UserRecord {
  return {
    avatar: row.avatar,
    createdAt: row.created_at,
    id: row.id,
    isRoot: row.is_root === 1,
    nickname: row.nickname,
    updatedAt: row.updated_at,
    username: row.username,
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

function hasField<T extends object>(
  value: T,
  key: keyof T,
): boolean {
  return Object.hasOwn(value, key)
}
