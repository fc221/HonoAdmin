import type { Migration, MigrationStatement } from '../../migrations'
import type { DBAdapter, SQLParameter } from './types'
import { migrations } from '../../migrations'

interface MigrationRecord {
  id: string
}

export interface MigrationSummary {
  id: string
  name: string
}

export interface MigrationStatus {
  appliedCount: number
  isComplete: boolean
  isFreshDatabase: boolean
  latestAppliedMigrationId: string | null
  latestCodeMigrationId: string | null
  pendingCount: number
  pendingMigrations: MigrationSummary[]
}

export type { Migration, MigrationStatement } from '../../migrations'

export async function runMigrations(
  db: DBAdapter,
  migrationList: Migration[] = migrations,
): Promise<void> {
  await runPendingMigrations(db, migrationList)
}

export async function runPendingMigrations(
  db: DBAdapter,
  migrationList: Migration[] = migrations,
): Promise<MigrationStatus> {
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

  return getMigrationStatus(db, migrationList)
}

export async function getMigrationStatus(
  db: DBAdapter,
  migrationList: Migration[] = migrations,
): Promise<MigrationStatus> {
  const hasMigrationTable = await hasMigrationsTable(db)

  if (!hasMigrationTable) {
    return createMigrationStatus(new Set(), migrationList, true)
  }

  const appliedRows = await db.query<MigrationRecord>(
    'SELECT id FROM _migrations',
  )
  const appliedIds = new Set(appliedRows.map((row) => row.id))
  return createMigrationStatus(appliedIds, migrationList, appliedIds.size === 0)
}

function normalizeMigrationStatement(
  statement: MigrationStatement,
): { params?: SQLParameter[], sql: string } {
  if (typeof statement === 'string') {
    return { sql: statement }
  }

  return statement
}

async function hasMigrationsTable(db: DBAdapter): Promise<boolean> {
  const row = await db.first<{ name: string }>(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = '_migrations'
  `)

  return !!row
}

function createMigrationStatus(
  appliedIds: Set<string>,
  migrationList: Migration[],
  isFreshDatabase: boolean,
): MigrationStatus {
  const pendingMigrations = migrationList
    .filter((migration) => !appliedIds.has(migration.id))
    .map((migration) => ({
      id: migration.id,
      name: migration.name,
    }))
  const appliedMigrations = migrationList.filter((migration) =>
    appliedIds.has(migration.id)
  )

  return {
    appliedCount: appliedMigrations.length,
    isComplete: pendingMigrations.length === 0,
    isFreshDatabase,
    latestAppliedMigrationId: appliedMigrations.at(-1)?.id ?? null,
    latestCodeMigrationId: migrationList.at(-1)?.id ?? null,
    pendingCount: pendingMigrations.length,
    pendingMigrations,
  }
}
