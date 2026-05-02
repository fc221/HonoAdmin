import type { DBAdapter } from '../database'

export async function createLocalSqliteAdapter(path: string): Promise<DBAdapter> {
  const { createSqliteAdapter } = await import('../database/adapter/sqlite')
  return createSqliteAdapter(path)
}
