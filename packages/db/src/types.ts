export type DBType = 'd1' | 'mysql' | 'pg' | 'sqlite'
export type DatabaseDialect = 'mysql' | 'pg' | 'sqlite'

export type SQLParameter = string | number | null
export type QueryRow = object

export interface QueryResult<T extends QueryRow = QueryRow> {
  rows: T[]
  rowsAffected: number
  lastInsertId?: number | string | bigint
}

export interface DBAdapter {
  readonly dialect: DatabaseDialect
  readonly kind: DBType
  query: <T extends QueryRow = QueryRow>(
    sql: string,
    params?: SQLParameter[],
  ) => Promise<T[]>
  first: <T extends QueryRow = QueryRow>(
    sql: string,
    params?: SQLParameter[],
  ) => Promise<T | null>
  execute: (sql: string, params?: SQLParameter[]) => Promise<QueryResult>
  insertAndGetId: (sql: string, params?: SQLParameter[]) => Promise<number>
  transaction: <T>(callback: (db: DBAdapter) => Promise<T>) => Promise<T>
  batch: (
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ) => Promise<void>
  close?: () => Promise<void> | void
}

export type BaseEntity = {
  id: number
  created_at: number
  updated_at: number
}
