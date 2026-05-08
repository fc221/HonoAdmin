import type {
  DatabaseDialect,
  DBAdapter,
  QueryResult,
  QueryRow,
  SQLParameter,
} from '../types'
import { DatabaseError } from '../../../utils/errors'

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

export function normalizeBunSqlForDialect(
  sql: string,
  dialect: DatabaseDialect,
): string {
  if (dialect === 'mysql') {
    return normalizeMysqlSql(sql)
  }

  if (dialect === 'pg') {
    return convertQuestionPlaceholders(sql)
  }

  return sql
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
      const normalizedSql = normalizeBunSqlForDialect(sql, this.dialect)
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
      const normalizedSql = normalizeBunSqlForDialect(sql, this.dialect)
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

function normalizeMysqlSql(sql: string): string {
  let normalized = ''
  let index = 0

  while (index < sql.length) {
    const char = sql[index]

    if (char === '\'') {
      const [value, nextIndex] = readSingleQuotedString(sql, index)
      normalized += value
      index = nextIndex
      continue
    }

    if (char === '`') {
      const [value, nextIndex] = readDelimitedValue(sql, index, '`')
      normalized += value
      index = nextIndex
      continue
    }

    if (char === '"') {
      const [value, nextIndex] = readDelimitedValue(sql, index, '"')
      const identifier = value.slice(1, -1)
      normalized += isSimpleIdentifier(identifier)
        ? `\`${identifier}\``
        : value
      index = nextIndex
      continue
    }

    const asTextLength = getAsTextLength(sql, index)
    if (asTextLength > 0) {
      normalized += 'AS CHAR'
      index += asTextLength
      continue
    }

    normalized += char
    index += 1
  }

  return normalized
}

function convertQuestionPlaceholders(sql: string): string {
  let normalized = ''
  let index = 0
  let placeholderIndex = 1

  while (index < sql.length) {
    const char = sql[index]

    if (char === '\'') {
      const [value, nextIndex] = readSingleQuotedString(sql, index)
      normalized += value
      index = nextIndex
      continue
    }

    if (char === '"' || char === '`') {
      const [value, nextIndex] = readDelimitedValue(sql, index, char)
      normalized += value
      index = nextIndex
      continue
    }

    if (char === '?') {
      normalized += `$${placeholderIndex}`
      placeholderIndex += 1
      index += 1
      continue
    }

    normalized += char
    index += 1
  }

  return normalized
}

function normalizeDateRow<T extends QueryRow>(row: T): T {
  let hasNormalizedValue = false
  const nextRow: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    if (isTimestampColumn(key)) {
      const timestamp = normalizeTimestampValue(value)
      nextRow[key] = timestamp
      hasNormalizedValue ||= timestamp !== value
      continue
    }

    if (value instanceof Date) {
      nextRow[key] = value.toISOString()
      hasNormalizedValue = true
      continue
    }

    nextRow[key] = value
  }

  return hasNormalizedValue ? nextRow as T : row
}

function appendReturningId(sql: string): string {
  if ((/\bRETURNING\b/i).test(sql)) {
    return sql
  }

  return `${sql.trimEnd()} RETURNING id`
}

function isTimestampColumn(key: string): boolean {
  return key === 'applied_at' || key === 'created_at' || key === 'updated_at'
}

function normalizeTimestampValue(value: unknown): unknown {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'bigint') {
    const numberValue = Number(value)
    return Number.isSafeInteger(numberValue) ? numberValue : value
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === 'string' && (/^\d+$/).test(value)) {
    const numberValue = Number(value)
    return Number.isSafeInteger(numberValue) ? numberValue : value
  }

  return value
}

function readSingleQuotedString(
  value: string,
  start: number,
): [string, number] {
  let index = start + 1

  while (index < value.length) {
    if (value[index] === '\'' && value[index + 1] === '\'') {
      index += 2
      continue
    }

    if (value[index] === '\'') {
      return [value.slice(start, index + 1), index + 1]
    }

    index += 1
  }

  return [value.slice(start), value.length]
}

function readDelimitedValue(
  value: string,
  start: number,
  delimiter: '"' | '`',
): [string, number] {
  let index = start + 1

  while (index < value.length) {
    if (value[index] === delimiter) {
      return [value.slice(start, index + 1), index + 1]
    }

    index += 1
  }

  return [value.slice(start), value.length]
}

function getAsTextLength(sql: string, index: number): number {
  if (
    index > 0
    && isIdentifierChar(sql[index - 1] ?? '')
  ) {
    return 0
  }

  const match = (/^AS\s+TEXT\b/i).exec(sql.slice(index))
  if (!match) {
    return 0
  }

  return match[0].length
}

function isSimpleIdentifier(value: string): boolean {
  return (/^[a-z_]\w*$/i).test(value)
}

function isIdentifierChar(value: string): boolean {
  return (/^\w$/).test(value)
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
