import type { BaseEntity } from '../../../../infra/database/types'

export interface WebPageEntity extends BaseEntity {
  alias: string
  category: string | null
  content: string
  summary: string | null
  title: string
}
