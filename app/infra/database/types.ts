export type DBType = 'd1' | 'sqlite'

export type SQLParameter = string | number | null
export type QueryRow = object

export interface QueryResult<T extends QueryRow = QueryRow> {
  rows: T[]
  rowsAffected: number
  lastInsertId?: number | string | bigint
}

export interface DBAdapter {
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
  transaction: <T>(callback: (db: DBAdapter) => Promise<T>) => Promise<T>
  batch: (
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ) => Promise<void>
  close?: () => Promise<void> | void
}

export type BaseEntity = {
  id: number
  created_at: string
  updated_at: string
}
