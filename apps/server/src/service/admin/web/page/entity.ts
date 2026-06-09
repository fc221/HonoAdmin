import type { BaseEntity } from '@hono-admin/db'

export interface WebPageEntity extends BaseEntity {
  alias: string
  category: string | null
  content: string
  summary: string | null
  title: string
}
