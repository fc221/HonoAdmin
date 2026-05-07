import type { DBAdapter, QueryResult, QueryRow, SQLParameter } from '../types'
import { ConfigurationError } from '../../../utils/errors'

export class UnavailableDBAdapter implements DBAdapter {
  readonly dialect = 'sqlite' as const
  readonly kind = 'sqlite' as const

  constructor(private readonly reason: string) {}

  query<T extends QueryRow = QueryRow>(
    sql: string,
    params?: SQLParameter[],
  ): Promise<T[]> {
    throw this.createError(sql, params)
  }

  first<T extends QueryRow = QueryRow>(
    sql: string,
    params?: SQLParameter[],
  ): Promise<T | null> {
    throw this.createError(sql, params)
  }

  execute(
    sql: string,
    params?: SQLParameter[],
  ): Promise<QueryResult> {
    throw this.createError(sql, params)
  }

  insertAndGetId(
    sql: string,
    params?: SQLParameter[],
  ): Promise<number> {
    throw this.createError(sql, params)
  }

  transaction<T>(): Promise<T> {
    throw new ConfigurationError(this.reason)
  }

  batch(): Promise<void> {
    throw new ConfigurationError(this.reason)
  }

  private createError(sql: string, params?: SQLParameter[]) {
    return new ConfigurationError(this.reason, { params, sql })
  }
}
