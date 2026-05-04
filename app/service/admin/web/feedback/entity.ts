import type { BaseEntity } from '../../../../infra/database'
import type { WebFeedbackStatus } from './enum'

export interface WebFeedbackEntity extends BaseEntity {
  contact: string | null
  content: string
  images: string | null
  reply: string | null
  status: WebFeedbackStatus
  title: string
  user_id: number | null
}
