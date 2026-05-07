import type { Migration, MigrationStatement } from '../../migrations/types'
import type { DBAdapter, SQLParameter } from './types'
import { getMigrationsForDialect } from '../../migrations/registry'

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

export type { Migration, MigrationStatement } from '../../migrations/types'

export async function runMigrations(
  db: DBAdapter,
  migrationList: Migration[] = getMigrationsForDialect(db.dialect),
): Promise<void> {
  await runPendingMigrations(db, migrationList)
}

export async function runPendingMigrations(
  db: DBAdapter,
  migrationList: Migration[] = getMigrationsForDialect(db.dialect),
): Promise<MigrationStatus> {
  await db.execute(getMigrationTableCreateSql(db))

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
  migrationList: Migration[] = getMigrationsForDialect(db.dialect),
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
  const row = await db.first<{ name: string }>(getMigrationTableExistsSql(db))

  return !!row
}

function getMigrationTableCreateSql(db: DBAdapter): string {
  if (db.dialect === 'sqlite') {
    return `
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `
  }

  return `
    CREATE TABLE IF NOT EXISTS _migrations (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at VARCHAR(30) NOT NULL
    )
  `
}

function getMigrationTableExistsSql(db: DBAdapter): string {
  if (db.dialect === 'mysql') {
    return `
      SELECT TABLE_NAME AS name
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '_migrations'
    `
  }

  if (db.dialect === 'pg') {
    return `
      SELECT tablename AS name
      FROM pg_catalog.pg_tables
      WHERE schemaname = current_schema()
        AND tablename = '_migrations'
    `
  }

  return `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = '_migrations'
  `
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
