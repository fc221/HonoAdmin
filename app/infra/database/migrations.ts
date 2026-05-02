import type { DBAdapter, SQLParameter } from './types'

export interface Migration {
  id: string
  name: string
  statements: MigrationStatement[]
}

export type MigrationStatement
  = | string
    | {
      params?: SQLParameter[]
      sql: string
    }

interface MigrationRecord {
  id: string
}

export const migrations: Migration[] = []

export async function runMigrations(
  db: DBAdapter,
  migrationList: Migration[] = migrations,
): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)

  const appliedRows = await db.query<MigrationRecord>(
    'SELECT id FROM _migrations',
  )
  const appliedIds = new Set(appliedRows.map((row) => row.id))

  for (const migration of migrationList) {
    if (appliedIds.has(migration.id)) {
      continue
    }

    await db.batch([
      ...migration.statements.map(normalizeMigrationStatement),
      {
        sql: 'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
        params: [migration.id, migration.name, new Date().toISOString()],
      },
    ])
  }
}

function normalizeMigrationStatement(
  statement: MigrationStatement,
): { params?: SQLParameter[], sql: string } {
  if (typeof statement === 'string') {
    return { sql: statement }
  }

  return statement
}
