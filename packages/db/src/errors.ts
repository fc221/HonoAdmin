import type { SQLParameter } from './types'

export class DatabaseError extends Error {
  readonly cause?: unknown
  readonly causeMessage?: string
  readonly sql?: string

  constructor(
    message: string,
    options: { cause?: unknown, causeMessage?: string, sql?: string } = {},
  ) {
    super(message)
    this.name = 'DatabaseError'
    this.cause = options.cause
    this.causeMessage = options.causeMessage
    this.sql = options.sql
  }
}

export class ConfigurationError extends Error {
  readonly params?: SQLParameter[]
  readonly sql?: string

  constructor(message: string, options: { params?: SQLParameter[], sql?: string } = {}) {
    super(message)
    this.name = 'ConfigurationError'
    this.params = options.params
    this.sql = options.sql
  }
}
