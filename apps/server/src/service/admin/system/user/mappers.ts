import type {
  UserHeaderProfile,
  UserRecord,
  UserSessionRole,
} from './dto'
import type { UserEntity } from './entity'

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

export interface UserCredentialEntity {
  id: number
  is_root: number
  password: string
  role_code: string | null
  role_id: number | null
  username: string
}

export interface UserHeaderProfileEntity {
  avatar: string | null
  id: number
  nickname: string | null
  username: string
}

export function toUserCredential(
  row: UserCredentialEntity,
  roleIds: number[],
): UserCredential {
  const isRoot = row.is_root === 1
  const roleId = isRoot
    ? roleIds[0] ?? row.role_id
    : row.role_id

  return {
    activeRoleId: roleId,
    id: row.id,
    isRoot,
    password: row.password,
    roleCode: row.role_code,
    roleId,
    roleIds,
    username: row.username,
  }
}

export function toUserHeaderProfile(
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

export function toUserRecord(row: UserEntity, roleIds: number[]): UserRecord {
  const isRoot = row.is_root === 1
  const roleId = isRoot
    ? roleIds[0] ?? row.role_id
    : row.role_id

  return {
    avatar: row.avatar,
    bio: row.bio,
    createdAt: row.created_at,
    gender: row.gender,
    id: row.id,
    isRoot,
    mail: row.mail,
    nickname: row.nickname,
    phone: row.phone,
    roleId,
    roleIds,
    status: row.status,
    updatedAt: row.updated_at,
    username: row.username,
  }
}
