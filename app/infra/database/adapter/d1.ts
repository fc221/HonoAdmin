import type {
  DBAdapter,
  QueryResult,
  QueryRow,
  SQLParameter,
} from '..'
import { DatabaseError } from '../../../utils'

export class D1Adapter implements DBAdapter {
  readonly kind = 'd1' as const
  private readonly database: D1Database

  /** 用 Cloudflare D1 实例初始化数据库适配器。 */
  constructor(database: D1Database) {
    this.database = database
  }

  /** 执行查询并返回结果列表。 */
  async query<T extends QueryRow = QueryRow>(
    sql: string,
    params: SQLParameter[] = [],
  ): Promise<T[]> {
    try {
      const result = await this.database
        .prepare(sql)
        .bind(...params)
        .all<T>()
      return result.results ?? []
    } catch (error) {
      const causeMessage
        = error instanceof Error ? error.message : String(error)

      throw new DatabaseError('failed to execute D1 query', {
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
      return await this.database
        .prepare(sql)
        .bind(...params)
        .first<T>()
    } catch (error) {
      const causeMessage
        = error instanceof Error ? error.message : String(error)

      throw new DatabaseError('failed to execute D1 first', {
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
      const result = await this.database
        .prepare(sql)
        .bind(...params)
        .run()
      return {
        rows: [],
        rowsAffected: result.meta?.changes ?? 0,
        lastInsertId: result.meta?.last_row_id,
      }
    } catch (error) {
      const causeMessage
        = error instanceof Error ? error.message : String(error)

      throw new DatabaseError('failed to execute D1 statement', {
        cause: error,
        causeMessage,
        sql,
      })
    }
  }

  /** 在 D1 环境下复用回调形式，保持与其他适配器一致的调用面。 */
  async transaction<T>(callback: (tx: DBAdapter) => Promise<T>): Promise<T> {
    // D1 doesn't have real transactions via API; use batch for atomicity
    // For now, we execute sequentially (D1 limitation)
    return callback(this)
  }

  /** 批量执行多条 SQL 语句。 */
  async batch(
    statements: Array<{ sql: string, params?: SQLParameter[] }>,
  ): Promise<void> {
    const stmts = statements.map((s) =>
      this.database.prepare(s.sql).bind(...(s.params ?? [])),
    )
    await this.database.batch(stmts)
  }
}
