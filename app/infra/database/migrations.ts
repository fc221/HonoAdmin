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

export const migrations: Migration[] = [
  {
    id: '0001_admin_management',
    name: 'create admin config and user tables',
    statements: [
      `
        CREATE TABLE IF NOT EXISTS app_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          config_type TEXT NOT NULL CHECK (config_type IN ('site', 'system')),
          config_key TEXT NOT NULL,
          config_value TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (config_type, config_key)
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          nickname TEXT,
          avatar TEXT,
          is_root INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `,
      {
        sql: `
          INSERT OR IGNORE INTO app_configs (
            config_type,
            config_key,
            config_value,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [
          'site',
          'site_name',
          'HonoAdmin',
          '2026-01-01T00:00:00.000Z',
          '2026-01-01T00:00:00.000Z',
        ],
      },
      {
        sql: `
          INSERT OR IGNORE INTO app_configs (
            config_type,
            config_key,
            config_value,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [
          'system',
          'maintenance_mode',
          'false',
          '2026-01-01T00:00:00.000Z',
          '2026-01-01T00:00:00.000Z',
        ],
      },
    ],
  },
]

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
