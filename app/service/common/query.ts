import type { SQLParameter } from '../../infra/database/types'

interface SQLCondition {
  params: SQLParameter[]
  sql: string
}

export function buildKeywordCondition(
  keyword: string,
  expressions: string[],
): SQLCondition | null {
  const normalizedKeyword = keyword.trim().toLowerCase()

  if (!normalizedKeyword) {
    return null
  }

  return {
    params: expressions.map(() => `%${normalizedKeyword}%`),
    sql: `(${expressions
      .map((expression) => `LOWER(COALESCE(${expression}, '')) LIKE ?`)
      .join(' OR ')})`,
  }
}

export function buildWhereClause(
  conditions: Array<SQLCondition | null | undefined>,
): SQLCondition {
  const activeConditions = conditions.filter(
    (condition): condition is SQLCondition => !!condition,
  )

  if (activeConditions.length === 0) {
    return { params: [], sql: '' }
  }

  return {
    params: activeConditions.flatMap((condition) => condition.params),
    sql: `WHERE ${activeConditions.map((condition) => condition.sql).join(' AND ')}`,
  }
}
