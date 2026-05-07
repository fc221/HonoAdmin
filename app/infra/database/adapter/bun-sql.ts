import type {
  DatabaseDialect,
  DBAdapter,
  QueryResult,
  QueryRow,
  SQLParameter,
} from '..'
import { DatabaseError } from '../../../utils'

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
  const bunSqlModule = 'bun'
  const { SQL } = await import(
    /* @vite-ignore */ bunSqlModule
  ) as { SQL: BunSqlConstructor }

  return new BunSqlAdapter(new SQL(databaseUrl), dialect)
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
      const normalizedParams = normalizeBunSqlParamsForDialect(
        sql,
        params,
        this.dialect,
      )
      const rows = await this.client.unsafe<T>(normalizedSql, normalizedParams)
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
      const normalizedParams = normalizeBunSqlParamsForDialect(
        sql,
        params,
        this.dialect,
      )
      const result = await this.client.unsafe(normalizedSql, normalizedParams)
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

export function normalizeBunSqlParamsForDialect(
  sql: string,
  params: SQLParameter[],
  dialect: DatabaseDialect,
): SQLParameter[] {
  if (dialect !== 'mysql' || params.length === 0) {
    return params
  }

  const temporalParamIndexes = getMysqlTemporalParamIndexes(sql)
  if (temporalParamIndexes.size === 0) {
    return params
  }

  return params.map((param, index) => {
    if (!temporalParamIndexes.has(index) || typeof param !== 'string') {
      return param
    }

    return toMysqlDateTimeValue(param)
  })
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
  let hasDate = false
  const nextRow: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      nextRow[key] = value.toISOString()
      hasDate = true
      continue
    }

    nextRow[key] = value
  }

  return hasDate ? nextRow as T : row
}

function appendReturningId(sql: string): string {
  if ((/\bRETURNING\b/i).test(sql)) {
    return sql
  }

  return `${sql.trimEnd()} RETURNING id`
}

function getMysqlTemporalParamIndexes(sql: string): Set<number> {
  const indexes = new Set<number>()

  for (const index of getMysqlInsertTemporalParamIndexes(sql)) {
    indexes.add(index)
  }

  for (const index of getMysqlUpdateTemporalParamIndexes(sql)) {
    indexes.add(index)
  }

  return indexes
}

function getMysqlInsertTemporalParamIndexes(sql: string): number[] {
  const insertIndex = findSqlKeyword(sql, 'INSERT')
  if (insertIndex < 0) {
    return []
  }

  const valuesIndex = findSqlKeyword(sql, 'VALUES', insertIndex)
  if (valuesIndex < 0) {
    return []
  }

  const columnsStart = findSqlChar(sql, '(', insertIndex, valuesIndex)
  const valuesStart = findSqlChar(sql, '(', valuesIndex)

  if (columnsStart < 0 || valuesStart < 0) {
    return []
  }

  const [columnsSql] = readParenthesizedValue(sql, columnsStart)
  const [valuesSql] = readParenthesizedValue(sql, valuesStart)
  const columns = splitTopLevelSqlList(columnsSql).map(getColumnName)
  const values = splitTopLevelSqlList(valuesSql)
  const indexes: number[] = []
  let paramIndex = countQuestionPlaceholders(sql.slice(0, valuesStart))

  values.forEach((value, valueIndex) => {
    const placeholderCount = countQuestionPlaceholders(value)
    if (
      placeholderCount === 1
      && value.trim() === '?'
      && isTemporalColumn(columns[valueIndex] ?? '')
    ) {
      indexes.push(paramIndex)
    }

    paramIndex += placeholderCount
  })

  return indexes
}

function getMysqlUpdateTemporalParamIndexes(sql: string): number[] {
  const updateIndex = findSqlKeyword(sql, 'UPDATE')
  if (updateIndex < 0) {
    return []
  }

  const setIndex = findSqlKeyword(sql, 'SET', updateIndex)
  if (setIndex < 0) {
    return []
  }

  const assignmentStart = setIndex + 'SET'.length
  const whereIndex = findSqlKeyword(sql, 'WHERE', assignmentStart)
  const assignments = splitTopLevelSqlList(
    sql.slice(assignmentStart, whereIndex < 0 ? sql.length : whereIndex),
  )
  const indexes: number[] = []
  let paramIndex = countQuestionPlaceholders(sql.slice(0, assignmentStart))

  for (const assignment of assignments) {
    const column = getAssignmentColumnName(assignment)
    const placeholderCount = countQuestionPlaceholders(assignment)

    if (
      placeholderCount === 1
      && assignment.includes('?')
      && isTemporalColumn(column)
    ) {
      indexes.push(paramIndex)
    }

    paramIndex += placeholderCount
  }

  return indexes
}

function findSqlKeyword(
  value: string,
  keyword: string,
  start = 0,
): number {
  const normalizedKeyword = keyword.toLowerCase()
  let index = start

  while (index < value.length) {
    const char = value[index]

    if (char === '\'') {
      const [, nextIndex] = readSingleQuotedString(value, index)
      index = nextIndex
      continue
    }

    if (char === '"' || char === '`') {
      const [, nextIndex] = readDelimitedValue(value, index, char)
      index = nextIndex
      continue
    }

    if (
      value.slice(index, index + keyword.length).toLowerCase()
      === normalizedKeyword
      && !isIdentifierChar(value[index - 1] ?? '')
      && !isIdentifierChar(value[index + keyword.length] ?? '')
    ) {
      return index
    }

    index += 1
  }

  return -1
}

function findSqlChar(
  value: string,
  target: string,
  start: number,
  end = value.length,
): number {
  let index = start

  while (index < end) {
    const char = value[index]

    if (char === '\'') {
      const [, nextIndex] = readSingleQuotedString(value, index)
      index = nextIndex
      continue
    }

    if (char === '"' || char === '`') {
      const [, nextIndex] = readDelimitedValue(value, index, char)
      index = nextIndex
      continue
    }

    if (char === target) {
      return index
    }

    index += 1
  }

  return -1
}

function readParenthesizedValue(
  value: string,
  start: number,
): [string, number] {
  let index = start + 1
  let depth = 1

  while (index < value.length) {
    const char = value[index]

    if (char === '\'') {
      const [, nextIndex] = readSingleQuotedString(value, index)
      index = nextIndex
      continue
    }

    if (char === '"' || char === '`') {
      const [, nextIndex] = readDelimitedValue(value, index, char)
      index = nextIndex
      continue
    }

    if (char === '(') {
      depth += 1
      index += 1
      continue
    }

    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        return [value.slice(start + 1, index), index + 1]
      }
    }

    index += 1
  }

  return [value.slice(start + 1), value.length]
}

function splitTopLevelSqlList(value: string): string[] {
  const parts: string[] = []
  let start = 0
  let index = 0
  let depth = 0

  while (index < value.length) {
    const char = value[index]

    if (char === '\'') {
      const [, nextIndex] = readSingleQuotedString(value, index)
      index = nextIndex
      continue
    }

    if (char === '"' || char === '`') {
      const [, nextIndex] = readDelimitedValue(value, index, char)
      index = nextIndex
      continue
    }

    if (char === '(') {
      depth += 1
      index += 1
      continue
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1)
      index += 1
      continue
    }

    if (char === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }

    index += 1
  }

  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

function getColumnName(value: string | undefined): string {
  if (!value) {
    return ''
  }

  const segments = value.trim().split('.')
  return segments.at(-1)
    ?.replace(/^["`]|["`]$/g, '')
    .trim()
    .toLowerCase() ?? ''
}

function getAssignmentColumnName(assignment: string): string {
  const [left] = assignment.split('=')
  return getColumnName(left)
}

function isTemporalColumn(value: string): boolean {
  return value === 'created_at' || value === 'updated_at'
}

function countQuestionPlaceholders(sql: string): number {
  let count = 0
  let index = 0

  while (index < sql.length) {
    const char = sql[index]

    if (char === '\'') {
      const [, nextIndex] = readSingleQuotedString(sql, index)
      index = nextIndex
      continue
    }

    if (char === '"' || char === '`') {
      const [, nextIndex] = readDelimitedValue(sql, index, char)
      index = nextIndex
      continue
    }

    if (char === '?') {
      count += 1
    }

    index += 1
  }

  return count
}

function toMysqlDateTimeValue(value: string): string {
  const match = (/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/)
    .exec(value)

  if (!match) {
    return value
  }

  return `${match[1]} ${match[2]}${match[3] ?? ''}`
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
