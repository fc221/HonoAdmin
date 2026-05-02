import type { AppRuntime, RuntimeBindings } from './types'
import { MemoryCacheAdapter } from '../cache/adapter/memory'
import { runMigrations } from '../database'

import { createLocalSqliteAdapter } from './local-sqlite'

export async function createBunRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  const databaseUrl = readLocalBinding(bindings, 'DATABASE_URL') || './honox-admin.sqlite'
  const cacheNamespace = readLocalBinding(bindings, 'CACHE_NAMESPACE') || 'honox-admin'
  const jwtSecret = readLocalBinding(bindings, 'JWT_SECRET') || undefined
  const db = await createLocalSqliteAdapter(databaseUrl)
  await runMigrations(db)

  return {
    cache: new MemoryCacheAdapter(cacheNamespace, 300),
    config: {
      appName: __APP_NAME__,
      appVersion: __APP_VERSION__,
      jwtSecret,
      runtimeTarget: 'bun',
    },
    db,
  }
}

function readLocalBinding(
  bindings: RuntimeBindings,
  key: 'CACHE_NAMESPACE' | 'DATABASE_URL' | 'JWT_SECRET',
): string {
  return bindings[key]?.trim() || process.env[key]?.trim() || ''
}
