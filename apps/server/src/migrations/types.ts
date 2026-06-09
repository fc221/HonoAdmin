import type { SQLParameter } from '@hono-admin/db'

export interface Migration {
  id: string
  name: string
  statements: MigrationStatement[]
}

export type MigrationStatement
  = | string
    | {
      params?: SQLParameter[]
      sql: string
    }
