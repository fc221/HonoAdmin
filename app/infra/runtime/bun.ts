import type { AppRuntime, RuntimeBindings } from './types'
import { MemoryCacheAdapter } from '../cache/adapter/memory'
import { runMigrations } from '../database'

import { createLocalSqliteAdapter } from './local-sqlite'

export async function createBunRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  const databaseUrl = bindings.DATABASE_URL?.trim() || './honox-admin.sqlite'
  const cacheNamespace = bindings.CACHE_NAMESPACE?.trim() || 'honox-admin'
  const jwtSecret = bindings.JWT_SECRET?.trim() || undefined
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
