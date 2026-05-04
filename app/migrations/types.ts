import type { SQLParameter } from '../infra/database'

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
