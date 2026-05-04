import type { ServiceContext } from '../../../types'
import type { UpdateStatus } from './dto'
import { getMigrationStatus, runPendingMigrations } from '../../../../infra/database'

export * from './dto'

export async function getUpdateStatus(
  ctx: ServiceContext,
): Promise<UpdateStatus> {
  const migration = await getDatabaseMigrationStatus(ctx)

  return {
    currentVersion: ctx.config.appVersion,
    migration,
  }
}

export function getDatabaseMigrationStatus(ctx: ServiceContext) {
  return getMigrationStatus(ctx.db)
}

export function runDatabaseMigrations(ctx: ServiceContext) {
  return runPendingMigrations(ctx.db)
}
