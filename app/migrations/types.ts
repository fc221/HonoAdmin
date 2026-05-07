import type { SQLParameter } from '../infra/database/types'

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
