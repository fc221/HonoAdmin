import type {
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

interface PostgresJsClient {
  begin: <T>(callback: (tx: PostgresJsClient) => Promise<T>) => Promise<T>
  end: () => Promise<void>
  unsafe: <T extends QueryRow = QueryRow>(
    sql: string,
    params?: SQLParameter[],
  ) => Promise<PostgresJsResult<T>>
}

type PostgresJsConstructor = (url: string) => PostgresJsClient
type PostgresJsResult<T extends QueryRow = QueryRow> = T[] & {
  count?: number
}

export async function createNodePgAdapter(
  databaseUrl: string,
): Promise<DBAdapter> {
  const postgres = await importPostgresJs()
  return new NodePgAdapter(postgres(databaseUrl))
}

async function importPostgresJs(): Promise<PostgresJsConstructor> {
  try {
    const module = await import('postgres') as unknown as {
      default: PostgresJsConstructor
    }
    return module.default
  } catch (error) {
    const causeMessage = error instanceof Error ? error.message : String(error)
    throw new DatabaseError('未找到 postgres 依赖，请安装后重试。', {
      cause: error,
      causeMessage,
    })
  }
}

class NodePgAdapter implements DBAdapter {
  readonly dialect = 'pg' as const
  readonly kind = 'pg' as const

  constructor(private readonly client: PostgresJsClient) {}

  async query<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T[]> {
    try {
      const normalizedSql = normalizeSqlForDialect(sql, 'pg')
      const rows = await this.client.unsafe<T>(normalizedSql, params)
      return Array.from(rows).map(normalizeDateRow)
    } catch (error) {
      throw createDatabaseError(error, 'failed to execute PostgreSQL query', sql)
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
      const normalizedSql = normalizeSqlForDialect(sql, 'pg')
      const result = await this.client.unsafe(normalizedSql, params)
      return {
        rows: Array.from(result).map(normalizeDateRow),
        rowsAffected: Number(result.count ?? 0),
      }
    } catch (error) {
      throw createDatabaseError(
        error,
        'failed to execute PostgreSQL statement',
        sql,
      )
    }
  }

  async insertAndGetId(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<number> {
    const row = await this.first<{ id: number | string }>(
      appendReturningId(sql),
      params,
    )
    return Number(row?.id)
  }

  async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
    return this.client.begin((tx) => callback(new NodePgAdapter(tx)))
  }

  async batch(
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ): Promise<void> {
    await this.transaction(async (tx) => {
      for (const statement of statements) {
        await tx.execute(statement.sql, statement.params)
      }
    })
  }

  async close(): Promise<void> {
    await this.client.end()
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
