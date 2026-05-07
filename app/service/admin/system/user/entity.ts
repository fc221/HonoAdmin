import type { BaseEntity } from '../../../../infra/database/types'
import { UserGender, UserStatus } from './enum'

export interface UserEntity extends BaseEntity {
  avatar: string | null
  bio: string | null
  gender: UserGender | null
  is_root: number
  nickname: string | null
  password: string
  username: string
  mail: string | null
  phone: string | null
  role_id: number | null
  status: UserStatus
}
