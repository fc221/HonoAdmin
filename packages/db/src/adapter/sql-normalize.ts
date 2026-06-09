import type { DatabaseDialect } from '../types'

export function normalizeSqlForDialect(
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

export function appendReturningId(sql: string): string {
  if ((/\bRETURNING\b/i).test(sql)) {
    return sql
  }

  return `${sql.trimEnd()} RETURNING id`
}

export function normalizeDateRow<T extends object>(row: T): T {
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
