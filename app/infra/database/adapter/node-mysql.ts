import type {
  DBAdapter,
  QueryResult,
  QueryRow,
  SQLParameter,
} from '../types'
import { DatabaseError } from '../../../utils/errors'
import {
  normalizeDateRow,
  normalizeSqlForDialect,
} from './sql-normalize'

interface NodeMysqlResultSetHeader {
  affectedRows?: number
  insertId?: number | string | bigint
}

interface NodeMysqlConnection {
  beginTransaction: () => Promise<void>
  commit: () => Promise<void>
  end: () => Promise<void>
  execute: <T>(
    sql: string,
    params?: SQLParameter[],
  ) => Promise<[T, unknown]>
  query: <T>(sql: string) => Promise<[T, unknown]>
  release?: () => void
  rollback: () => Promise<void>
}

interface NodeMysqlPool {
  end: () => Promise<void>
  execute: <T>(
    sql: string,
    params?: SQLParameter[],
  ) => Promise<[T, unknown]>
  getConnection: () => Promise<NodeMysqlConnection>
  query: <T>(sql: string) => Promise<[T, unknown]>
}

interface NodeMysqlModule {
  createPool: (config: { uri: string }) => NodeMysqlPool
}

export async function createNodeMysqlAdapter(
  databaseUrl: string,
): Promise<DBAdapter> {
  const mysql = await importNodeMysql()
  const pool = mysql.createPool({ uri: databaseUrl })

  return new NodeMysqlAdapter(pool)
}

async function importNodeMysql(): Promise<NodeMysqlModule> {
  try {
    const module = await import('mysql2/promise') as unknown as {
      createPool: NodeMysqlModule['createPool']
      default?: NodeMysqlModule
    }
    return module.default ?? { createPool: module.createPool }
  } catch (error) {
    const causeMessage = error instanceof Error ? error.message : String(error)
    throw new DatabaseError('未找到 mysql2 依赖，请安装后重试。', {
      cause: error,
      causeMessage,
    })
  }
}

abstract class BaseNodeMysqlAdapter implements DBAdapter {
  readonly dialect = 'mysql' as const
  readonly kind = 'mysql' as const

  protected abstract executor():
    | NodeMysqlPool
    | NodeMysqlConnection

  async query<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T[]> {
    try {
      const normalizedSql = normalizeSqlForDialect(sql, 'mysql')
      const [rows] = await this.executor().execute<T[]>(
        normalizedSql,
        params,
      )
      return Array.from(rows).map(normalizeDateRow)
    } catch (error) {
      throw createDatabaseError(error, 'failed to execute MySQL query', sql)
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
      const normalizedSql = normalizeSqlForDialect(sql, 'mysql')
      const [result] = await this.executor().execute<
        NodeMysqlResultSetHeader | QueryRow[]
      >(normalizedSql, params)

      if (Array.isArray(result)) {
        return {
          rows: result.map(normalizeDateRow),
          rowsAffected: 0,
        }
      }

      return {
        lastInsertId: result.insertId,
        rows: [],
        rowsAffected: Number(result.affectedRows ?? 0),
      }
    } catch (error) {
      throw createDatabaseError(error, 'failed to execute MySQL statement', sql)
    }
  }

  async insertAndGetId(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<number> {
    const result = await this.execute(sql, params)
    return Number(result.lastInsertId)
  }

  abstract transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T>

  async batch(
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ): Promise<void> {
    for (const statement of statements) {
      const normalizedSql = normalizeSqlForDialect(statement.sql, 'mysql')
      const params = statement.params ?? []
      try {
        if (params.length > 0) {
          await this.executor().execute(normalizedSql, params)
        } else {
          await this.executor().query(normalizedSql)
        }
      } catch (error) {
        throw createDatabaseError(
          error,
          'failed to execute MySQL batch statement',
          statement.sql,
        )
      }
    }
  }
}

class NodeMysqlAdapter extends BaseNodeMysqlAdapter {
  constructor(private readonly pool: NodeMysqlPool) {
    super()
  }

  protected executor(): NodeMysqlPool {
    return this.pool
  }

  async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection()
    await connection.beginTransaction()

    try {
      const result = await callback(new NodeMysqlTransactionAdapter(connection))
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release?.()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

class NodeMysqlTransactionAdapter extends BaseNodeMysqlAdapter {
  constructor(private readonly connection: NodeMysqlConnection) {
    super()
  }

  protected executor(): NodeMysqlConnection {
    return this.connection
  }

  async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
    return callback(this)
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
