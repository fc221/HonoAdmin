import { BaseEntity } from './base'


export type UserEntity   = BaseEntity & {
  avatar: string | null
  nickname: string | null
  username: string
  password: string
  is_root: number
}