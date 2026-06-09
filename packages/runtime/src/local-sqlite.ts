import type { DatabaseDialect, DBAdapter } from '@hono-admin/db'

export async function createLocalDatabaseAdapter(
  databaseUrl: string,
): Promise<DBAdapter> {
  const dialect = getDatabaseDialect(databaseUrl)

  if (dialect === 'mysql') {
    if (isBunRuntime()) {
      const { createBunSqlAdapter } = await import('@hono-admin/db/adapter/bun-sql')
      return createBunSqlAdapter(databaseUrl, 'mysql')
    }
    const { createNodeMysqlAdapter } = await import('@hono-admin/db/adapter/node-mysql')
    return createNodeMysqlAdapter(databaseUrl)
  }

  if (dialect === 'pg') {
    if (isBunRuntime()) {
      const { createBunSqlAdapter } = await import('@hono-admin/db/adapter/bun-sql')
      return createBunSqlAdapter(databaseUrl, 'pg')
    }
    const { createNodePgAdapter } = await import('@hono-admin/db/adapter/node-pg')
    return createNodePgAdapter(databaseUrl)
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

function isBunRuntime(): boolean {
  return (
    typeof process !== 'undefined'
    && typeof (process.versions as Record<string, string | undefined>).bun === 'string'
  )
}
