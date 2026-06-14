import type {
  DBAdapter,
  QueryResult,
  QueryRow,
  SQLParameter,
} from '../types'
import { DatabaseError } from '../errors'

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

/**
 * 异步互斥锁(promise 链)。bun:sqlite 是单个同步连接,事务的 BEGIN..COMMIT 跨越多个 await,
 * 一旦事务回调里 await 了真异步 I/O(让出宏任务),并发请求可能交错进它的事务,污染数据甚至
 * 卡死状态机。用它把事务串行化:事务期间独占连接,其它语句/事务排队等待,杜绝交错。
 */
class Mutex {
  private tail: Promise<void> = Promise.resolve()

  acquire(): Promise<() => void> {
    let release!: () => void
    const next = new Promise<void>((resolve) => {
      release = resolve
    })
    const acquired = this.tail.then(() => release)
    this.tail = this.tail.then(() => next)
    return acquired
  }
}

function toDatabaseError(
  error: unknown,
  action: string,
  sql: string,
): DatabaseError {
  const causeMessage = error instanceof Error ? error.message : String(error)
  return new DatabaseError(`failed to execute SQLite ${action}`, {
    cause: error,
    causeMessage,
    sql,
  })
}

/**
 * 事务内执行器:直接对底层连接跑语句,不再加锁(外层事务已独占连接)。
 * 同时作为 SqliteAdapter 的原始语句实现基类。
 */
class SqliteTransactionAdapter implements DBAdapter {
  readonly dialect = 'sqlite' as const
  readonly kind = 'sqlite' as const

  constructor(protected readonly database: SqliteDatabase) {}

  /** 执行查询并返回结果列表。 */
  async query<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T[]> {
    try {
      return this.database.prepare(sql).all(...params) as T[]
    } catch (error) {
      throw toDatabaseError(error, 'query', sql)
    }
  }

  /** 执行查询并返回第一条记录。 */
  async first<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T | null> {
    try {
      return (this.database.prepare(sql).get(...params) as T | null | undefined) ?? null
    } catch (error) {
      throw toDatabaseError(error, 'first', sql)
    }
  }

  /** 执行写操作并返回受影响行数等元数据。 */
  async execute(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<QueryResult> {
    try {
      const result = this.database.prepare(sql).run(...params)
      return {
        rows: [],
        rowsAffected: result.changes ?? 0,
        lastInsertId: result.lastInsertRowid,
      }
    } catch (error) {
      throw toDatabaseError(error, 'statement', sql)
    }
  }

  async insertAndGetId(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<number> {
    const result = await this.execute(sql, params)
    return Number(result.lastInsertId)
  }

  /** 已在外层事务内:嵌套事务复用当前事务,不再 BEGIN。 */
  async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
    return callback(this)
  }

  /** 已在事务内:顺序执行即可。 */
  async batch(
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ): Promise<void> {
    for (const statement of statements) {
      this.runStatement(statement)
    }
  }

  protected runStatement(
    statement: { sql: string, params?: SQLParameter[] },
  ): void {
    try {
      this.database.prepare(statement.sql).run(...(statement.params ?? []))
    } catch (error) {
      throw toDatabaseError(error, 'statement', statement.sql)
    }
  }
}

export class SqliteAdapter extends SqliteTransactionAdapter {
  private readonly mutex = new Mutex()

  /** 创建 SQLite 适配器并初始化常用 pragma。 */
  constructor(database: SqliteDatabase) {
    super(database)
    this.database.exec('PRAGMA journal_mode = WAL')
    this.database.exec('PRAGMA foreign_keys = ON')
  }

  // 注意:单语句(query/first/execute)直接继承基类的「裸执行」,不加锁。
  // bun:sqlite 单语句是同步原子的,且事务回调里若误用外层 db,裸执行会并入当前事务
  // (与改造前行为一致),而不会去抢事务持有的锁造成死锁。锁只用于串行化事务 / batch。

  /** 用显式 BEGIN/COMMIT/ROLLBACK 包装事务回调,并独占连接直至结束。 */
  async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
    const release = await this.mutex.acquire()
    const tx = new SqliteTransactionAdapter(this.database)
    try {
      this.database.exec('BEGIN')
      try {
        const result = await callback(tx)
        this.database.exec('COMMIT')
        return result
      } catch (error) {
        this.database.exec('ROLLBACK')
        throw error
      }
    } finally {
      release()
    }
  }

  /** 顶层 batch:独占连接,用显式 BEGIN/COMMIT 包一层。 */
  async batch(
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ): Promise<void> {
    const release = await this.mutex.acquire()
    try {
      this.database.exec('BEGIN')
      try {
        for (const statement of statements) {
          this.runStatement(statement)
        }
        this.database.exec('COMMIT')
      } catch (error) {
        this.database.exec('ROLLBACK')
        throw error
      }
    } finally {
      release()
    }
  }

  /** 关闭底层 SQLite 连接。 */
  async close(): Promise<void> {
    this.database.close()
  }
}
