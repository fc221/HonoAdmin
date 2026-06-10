import type { DatabaseDialect, DBAdapter } from '@hono-admin/db'

export async function createLocalDatabaseAdapter(
  databaseUrl: string,
): Promise<DBAdapter> {
  const dialect = getDatabaseDialect(databaseUrl)

  if (dialect === 'mysql') {
    const { createMysqlAdapter } = await import('@hono-admin/db/adapter/mysql')
    return createMysqlAdapter(databaseUrl)
  }

  if (dialect === 'pg') {
    const { createPostgresqlAdapter } = await import('@hono-admin/db/adapter/postgresql')
    return createPostgresqlAdapter(databaseUrl)
  }

  return createLocalSqliteAdapter(databaseUrl)
}

export async function createLocalSqliteAdapter(path: string): Promise<DBAdapter> {
  const { createSqliteAdapter } = await import('@hono-admin/db/adapter/sqlite')
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
