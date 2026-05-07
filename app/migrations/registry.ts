import type { Migration } from './types'
import { mysqlMigrations } from './mysql/registry'
import { pgMigrations } from './pg/registry'
import { sqliteMigrations } from './sqlite/registry'

export { mysqlMigrations, pgMigrations, sqliteMigrations }

export type MigrationDialect = 'mysql' | 'pg' | 'sqlite'

export const migrations: Migration[] = sqliteMigrations

export function getMigrationsForDialect(dialect: MigrationDialect): Migration[] {
  if (dialect === 'mysql') {
    return mysqlMigrations
  }

  if (dialect === 'pg') {
    return pgMigrations
  }

  return sqliteMigrations
}
