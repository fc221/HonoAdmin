import type { BaseEntity } from '.'

export type UserEntity = BaseEntity & {
  avatar: string | null
  is_root: number
  nickname: string | null
  password: string
  username: string
}
