import type { BaseEntity } from '../../../../infra/database/types'

export interface WebNotificationEntity extends BaseEntity {
  alias: string
  content: string
  is_important: number
  is_top: number
  title: string
}
