import type {
  DBAdapter,
  QueryResult,
  QueryRow,
  SQLParameter,
} from '..'
import { DatabaseError } from '../../../utils'

interface SqliteRunResult {
  changes?: number
  lastInsertRowid?: bigint | number
}

interface SqliteStatement {
  all: (...params: SQLParameter[]) => unknown[]
  get: (...params: SQLParameter[]) => unknown
  run: (...params: SQLParameter[]) => SqliteRunResult
}

interface SqliteDatabase {
  close: () => void
  exec: (sql: string) => unknown
  prepare: (sql: string) => SqliteStatement
}

type BunSqliteConstructor = new (
  path: string,
  options: { create: boolean },
) => {
  close: (throwOnError?: boolean) => void
  query: (sql: string) => SqliteStatement
  run: (sql: string) => unknown
}

type NodeSqliteConstructor = new (path: string) => {
  close: () => void
  exec: (sql: string) => unknown
  prepare: (sql: string) => SqliteStatement
}

export async function createSqliteAdapter(path: string): Promise<DBAdapter> {
  const database = isBunRuntime()
    ? await createBunSqliteDatabase(path)
    : await createNodeSqliteDatabase(path)

  return new SqliteAdapter(database)
}

async function createBunSqliteDatabase(path: string): Promise<SqliteDatabase> {
  const bunSqliteModule = 'bun:sqlite'
  const { default: Database } = await import(
    /* @vite-ignore */ bunSqliteModule
  ) as { default: BunSqliteConstructor }
  const database = new Database(path, { create: true })

  return {
    close: () => database.close(false),
    exec: (sql) => database.run(sql),
    prepare: (sql) => database.query(sql),
  }
}

async function createNodeSqliteDatabase(path: string): Promise<SqliteDatabase> {
  const nodeSqliteModule = 'node:sqlite'
  const { DatabaseSync } = await import(
    /* @vite-ignore */ nodeSqliteModule
  ) as { DatabaseSync: NodeSqliteConstructor }
  const database = new DatabaseSync(path)

  return {
    close: () => database.close(),
    exec: (sql) => database.exec(sql),
    prepare: (sql) => database.prepare(sql),
  }
}

function isBunRuntime(): boolean {
  return (
    typeof process !== 'undefined'
    && typeof (process.versions as Record<string, string | undefined>).bun === 'string'
  )
}

export class SqliteAdapter implements DBAdapter {
  readonly dialect = 'sqlite' as const
  readonly kind = 'sqlite' as const
  private readonly database: SqliteDatabase

  /** 创建 SQLite 适配器并初始化常用 pragma。 */
  constructor(database: SqliteDatabase) {
    this.database = database
    this.database.exec('PRAGMA journal_mode = WAL')
    this.database.exec('PRAGMA foreign_keys = ON')
  }

  /** 执行查询并返回结果列表。 */
  async query<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T[]> {
    try {
      const stmt = this.database.prepare(sql)
      return stmt.all(...params) as T[]
    } catch (error) {
      const causeMessage
        = error instanceof Error ? error.message : String(error)

      throw new DatabaseError('failed to execute SQLite query', {
        cause: error,
        causeMessage,
        sql,
      })
    }
  }

  /** 执行查询并返回第一条记录。 */
  async first<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T | null> {
    try {
      const statement = this.database.prepare(sql)
      return (statement.get(...params) as T | null | undefined) ?? null
    } catch (error) {
      const causeMessage
        = error instanceof Error ? error.message : String(error)

      throw new DatabaseError('failed to execute SQLite first', {
        cause: error,
        causeMessage,
        sql,
      })
    }
  }

  /** 执行写操作并返回受影响行数等元数据。 */
  async execute(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<QueryResult> {
    try {
      const statement = this.database.prepare(sql)
      const result = statement.run(...params)

      return {
        rows: [],
        rowsAffected: result.changes ?? 0,
        lastInsertId: result.lastInsertRowid,
      }
    } catch (error) {
      const causeMessage
        = error instanceof Error ? error.message : String(error)

      throw new DatabaseError('failed to execute SQLite statement', {
        cause: error,
        causeMessage,
        sql,
      })
    }
  }

  async insertAndGetId(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<number> {
    const result = await this.execute(sql, params)
    return Number(result.lastInsertId)
  }

  /** 用显式 BEGIN/COMMIT/ROLLBACK 包装事务回调。 */
  async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
    this.database.exec('BEGIN')

    try {
      const result = await callback(this)
      this.database.exec('COMMIT')
      return result
    } catch (error) {
      this.database.exec('ROLLBACK')
      throw error
    }
  }

  /** 在同一事务里顺序执行多条 SQL 语句。 */
  async batch(
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ): Promise<void> {
    this.database.exec('BEGIN')
    try {
      for (const s of statements) {
        this.database.prepare(s.sql).run(...(s.params ?? []))
      }
      this.database.exec('COMMIT')
    } catch (err) {
      this.database.exec('ROLLBACK')
      throw err
    }
  }

  /** 关闭底层 SQLite 连接。 */
  async close(): Promise<void> {
    this.database.close()
  }
}
