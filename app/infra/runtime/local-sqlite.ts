import type { DatabaseDialect, DBAdapter } from '../database'

export async function createLocalDatabaseAdapter(
  databaseUrl: string,
): Promise<DBAdapter> {
  const dialect = getDatabaseDialect(databaseUrl)

  if (dialect === 'mysql' || dialect === 'pg') {
    const { createBunSqlAdapter } = await import('../database/adapter/bun-sql')
    return createBunSqlAdapter(databaseUrl, dialect)
  }

  return createLocalSqliteAdapter(databaseUrl)
}

export async function createLocalSqliteAdapter(path: string): Promise<DBAdapter> {
  const { createSqliteAdapter } = await import('../database/adapter/sqlite')
  return createSqliteAdapter(path)
}

export function getDatabaseDialect(databaseUrl: string): DatabaseDialect {
  if ((/^mysql2?:\/\//i).test(databaseUrl)) {
    return 'mysql'
  }

  if ((/^postgres(?:ql)?:\/\//i).test(databaseUrl)) {
    return 'pg'
  }

  return 'sqlite'
}
