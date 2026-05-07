import type {
  DatabaseDialect,
  DBAdapter,
  QueryResult,
  QueryRow,
} from '../app/infra/database/types'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import {
  normalizeBunSqlForDialect,
  normalizeBunSqlParamsForDialect,
} from '../app/infra/database/adapter/bun-sql'
import {
  getMigrationStatus,
  runMigrations,
} from '../app/infra/database/migrator'
import {
  createLocalDatabaseAdapter,
  createLocalSqliteAdapter,
  getDatabaseDialect,
} from '../app/infra/runtime/local-sqlite'
import {
  getMigrationsForDialect,
  mysqlMigrations,
  pgMigrations,
  sqliteMigrations,
} from '../app/migrations/registry'

describe('migration dialects', () => {
  test('migration registries keep matching id, name, and order', () => {
    expect(toMigrationSignatures(mysqlMigrations)).toEqual(
      toMigrationSignatures(sqliteMigrations),
    )
    expect(toMigrationSignatures(pgMigrations)).toEqual(
      toMigrationSignatures(sqliteMigrations),
    )
  })

  test('registry lookup maps D1 and SQLite to sqlite migrations', () => {
    expect(getMigrationsForDialect('sqlite')).toBe(sqliteMigrations)
    expect(getMigrationsForDialect('mysql')).toBe(mysqlMigrations)
    expect(getMigrationsForDialect('pg')).toBe(pgMigrations)
  })

  test('migration status uses dialect-specific migration table lookup', async () => {
    const mysqlDb = createStatusOnlyDb('mysql')
    const pgDb = createStatusOnlyDb('pg')
    const sqliteDb = createStatusOnlyDb('sqlite')

    await getMigrationStatus(mysqlDb)
    await getMigrationStatus(pgDb)
    await getMigrationStatus(sqliteDb)

    expect(mysqlDb.firstSql).toContain('information_schema.TABLES')
    expect(pgDb.firstSql).toContain('pg_catalog.pg_tables')
    expect(sqliteDb.firstSql).toContain('sqlite_master')
  })

  test('SQLite adapter can insert and return id through adapter method', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hono-admin-dialect-'))
    const db = await createLocalSqliteAdapter(join(dir, 'test.sqlite'))

    try {
      await db.execute(`
        CREATE TABLE sample (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `)
      const id = await db.insertAndGetId(
        'INSERT INTO sample (name) VALUES (?)',
        ['first'],
      )
      expect(id).toBe(1)
    } finally {
      await db.close?.()
      await rm(dir, { force: true, recursive: true })
    }
  })

  test('Bun SQL runtime dialect is selected from database URL', async () => {
    expect(getDatabaseDialect('./honox-admin.sqlite')).toBe('sqlite')
    expect(getDatabaseDialect('mysql://user:pass@localhost/app')).toBe('mysql')
    expect(getDatabaseDialect('mysql2://user:pass@localhost/app')).toBe('mysql')
    expect(getDatabaseDialect('postgres://user:pass@localhost/app')).toBe('pg')
    expect(getDatabaseDialect('postgresql://user:pass@localhost/app')).toBe('pg')

    const mysqlDb = await createLocalDatabaseAdapter(
      'mysql://user:pass@127.0.0.1:3306/hono_admin_test',
    )
    const pgDb = await createLocalDatabaseAdapter(
      'postgres://user:pass@127.0.0.1:5432/hono_admin_test',
    )

    expect(mysqlDb.kind).toBe('mysql')
    expect(mysqlDb.dialect).toBe('mysql')
    expect(pgDb.kind).toBe('pg')
    expect(pgDb.dialect).toBe('pg')
    await mysqlDb.close?.()
    await pgDb.close?.()
  })

  test('Bun SQL normalization keeps business SQL portable', () => {
    const source = `
      SELECT "account".id, "role".name, 'AS TEXT and "account" stay literal' AS sample
      FROM "account"
      LEFT JOIN "role" ON "role".id = "account".role_id
      WHERE CAST("account".id AS TEXT) LIKE ?
        AND note = '?'
    `

    expect(normalizeBunSqlForDialect(source, 'mysql')).toContain(
      'CAST(`account`.id AS CHAR) LIKE ?',
    )
    expect(normalizeBunSqlForDialect(source, 'mysql')).toContain('`role`.name')
    expect(normalizeBunSqlForDialect(source, 'mysql')).toContain(
      '\'AS TEXT and "account" stay literal\'',
    )
    expect(normalizeBunSqlForDialect(source, 'pg')).toContain(
      'CAST("account".id AS TEXT) LIKE $1',
    )
    expect(normalizeBunSqlForDialect(source, 'pg')).toContain('note = \'?\'')
  })

  test('MySQL temporal params are normalized only for timestamp columns', () => {
    const insertParams = normalizeBunSqlParamsForDialect(
      `
        INSERT INTO sys_user (username, created_at, updated_at, note)
        VALUES (?, ?, ?, ?)
      `,
      [
        'root',
        '2026-05-07T10:20:30+08:00',
        '2026-05-07T10:20:30+08:00',
        '2026-05-07T10:20:30+08:00',
      ],
      'mysql',
    )
    expect(insertParams).toEqual([
      'root',
      '2026-05-07 10:20:30',
      '2026-05-07 10:20:30',
      '2026-05-07T10:20:30+08:00',
    ])

    const updateParams = normalizeBunSqlParamsForDialect(
      'UPDATE sys_user SET nickname = ?, updated_at = ? WHERE id = ?',
      ['Root', '2026-05-07T10:20:30+08:00', 1],
      'mysql',
    )
    expect(updateParams).toEqual(['Root', '2026-05-07 10:20:30', 1])
  })

  test.skipIf(!process.env.MYSQL_TEST_DATABASE_URL)(
    'runs full MySQL migration smoke when configured',
    async () => {
      const db = await createLocalDatabaseAdapter(process.env.MYSQL_TEST_DATABASE_URL!)
      try {
        await runMigrations(db)
        expect((await getMigrationStatus(db)).isComplete).toBe(true)
      } finally {
        await db.close?.()
      }
    },
  )

  test.skipIf(!process.env.PG_TEST_DATABASE_URL)(
    'runs full PostgreSQL migration smoke when configured',
    async () => {
      const db = await createLocalDatabaseAdapter(process.env.PG_TEST_DATABASE_URL!)
      try {
        await runMigrations(db)
        expect((await getMigrationStatus(db)).isComplete).toBe(true)
      } finally {
        await db.close?.()
      }
    },
  )
})

function toMigrationSignatures(
  migrations: Array<{ id: string, name: string }>,
): Array<{ id: string, name: string }> {
  return migrations.map((migration) => ({
    id: migration.id,
    name: migration.name,
  }))
}

function createStatusOnlyDb(dialect: DatabaseDialect): DBAdapter & {
  firstSql: string
} {
  return {
    dialect,
    firstSql: '',
    kind: dialect,
    async batch(): Promise<void> {},
    async execute(): Promise<QueryResult> {
      throw new Error('execute is not used by this test')
    },
    async first<T extends QueryRow = QueryRow>(sql: string): Promise<T | null> {
      this.firstSql = sql
      return null
    },
    async insertAndGetId(): Promise<number> {
      throw new Error('insertAndGetId is not used by this test')
    },
    async query<T extends QueryRow = QueryRow>(): Promise<T[]> {
      return []
    },
    async transaction<T>(callback: (db: DBAdapter) => Promise<T>): Promise<T> {
      return callback(this)
    },
  }
}
