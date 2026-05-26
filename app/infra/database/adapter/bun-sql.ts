import type {
  DatabaseDialect,
  DBAdapter,
  QueryResult,
  QueryRow,
  SQLParameter,
} from '../types'
import { DatabaseError } from '../../../utils/errors'
import {
  appendReturningId,
  normalizeDateRow,
  normalizeSqlForDialect,
} from './sql-normalize'

interface BunSqlClient {
  begin: <T>(callback: (tx: BunSqlClient) => Promise<T>) => Promise<T>
  close?: () => Promise<void> | void
  unsafe: <T extends QueryRow = QueryRow>(
    sql: string,
    params?: SQLParameter[],
  ) => Promise<BunSqlResult<T>>
}

type BunSqlConstructor = new (url: string) => BunSqlClient
type BunSqlResult<T extends QueryRow = QueryRow> = T[] & {
  affectedRows?: number
  count?: number
  lastInsertRowid?: bigint | number | string
}

export async function createBunSqlAdapter(
  databaseUrl: string,
  dialect: Exclude<DatabaseDialect, 'sqlite'>,
): Promise<DBAdapter> {
  const SQL = await getBunSqlConstructor()

  return new BunSqlAdapter(new SQL(databaseUrl), dialect)
}

async function getBunSqlConstructor(): Promise<BunSqlConstructor> {
  const runtime = globalThis as typeof globalThis & {
    Bun?: { SQL?: BunSqlConstructor }
  }
  const SQL = runtime.Bun?.SQL ?? await importNativeBunSqlConstructor()

  if (!SQL) {
    throw new DatabaseError('Bun SQL 仅支持 Bun runtime。')
  }

  return SQL
}

async function importNativeBunSqlConstructor(): Promise<BunSqlConstructor | null> {
  try {
    // Vite SSR must not statically resolve Bun's runtime-only built-in module.
    // eslint-disable-next-line no-new-func
    const importNative = new Function(
      'specifier',
      'return import(specifier)',
    ) as (specifier: string) => Promise<{ SQL?: BunSqlConstructor }>
    const module = await importNative('bun')
    return module.SQL ?? null
  } catch {
    return null
  }
}

class BunSqlAdapter implements DBAdapter {
  readonly kind: 'mysql' | 'pg'

  constructor(
    private readonly client: BunSqlClient,
    readonly dialect: 'mysql' | 'pg',
  ) {
    this.kind = dialect
  }

  async query<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T[]> {
    try {
      const normalizedSql = normalizeSqlForDialect(sql, this.dialect)
      const rows = await this.client.unsafe<T>(normalizedSql, params)
      return Array.from(rows).map(normalizeDateRow)
    } catch (error) {
      throw createDatabaseError(error, 'failed to execute Bun SQL query', sql)
    }
  }

  async first<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params)
    return rows[0] ?? null
  }

  async execute(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<QueryResult> {
    try {
      const normalizedSql = normalizeSqlForDialect(sql, this.dialect)
      const result = await this.client.unsafe(normalizedSql, params)
      return {
        lastInsertId: result.lastInsertRowid,
        rows: Array.from(result).map(normalizeDateRow),
        rowsAffected: Number(result.affectedRows ?? result.count ?? 0),
      }
    } catch (error) {
      throw createDatabaseError(error, 'failed to execute Bun SQL statement', sql)
    }
  }

  async insertAndGetId(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<number> {
    if (this.dialect === 'pg') {
      const row = await this.first<{ id: number | string }>(
        appendReturningId(sql),
        params,
      )
      return Number(row?.id)
    }

    const result = await this.execute(sql, params)
    return Number(result.lastInsertId)
  }

  async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
    return this.client.begin((tx) =>
      callback(new BunSqlAdapter(tx, this.dialect))
    )
  }

  async batch(
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ): Promise<void> {
    if (this.dialect === 'mysql') {
      for (const statement of statements) {
        await this.execute(statement.sql, statement.params)
      }
      return
    }

    await this.transaction(async (tx) => {
      for (const statement of statements) {
        await tx.execute(statement.sql, statement.params)
      }
    })
  }

  async close(): Promise<void> {
    await this.client.close?.()
  }
}

function createDatabaseError(
  error: unknown,
  message: string,
  sql: string,
): DatabaseError {
  const causeMessage = error instanceof Error ? error.message : String(error)

  return new DatabaseError(message, {
    cause: error,
    causeMessage,
    sql,
  })
}
