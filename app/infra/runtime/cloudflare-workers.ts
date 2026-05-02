import type { AppRuntime, RuntimeBindings } from './types'
import { ConfigurationError } from '../../utils'
import { KVCacheAdapter } from '../cache/adapter/kv'
import { NoopCacheAdapter } from '../cache/adapter/noop'
import { runMigrations } from '../database'

import { D1Adapter } from '../database/adapter/d1'

let migrationPromise: Promise<void> | null = null

export async function createCloudflareWorkersRuntime(
  bindings: RuntimeBindings,
): Promise<AppRuntime> {
  if (!bindings.DB) {
    throw new ConfigurationError('Cloudflare Workers 运行时缺少 DB 绑定。', {
      binding: 'DB',
    })
  }

  const db = new D1Adapter(bindings.DB)
  migrationPromise ??= runMigrations(db)
  await migrationPromise

  return {
    cache: bindings.CACHE
      ? new KVCacheAdapter(bindings.CACHE, 'honox-admin', 300)
      : new NoopCacheAdapter(),
    config: {
      appName: __APP_NAME__,
      appVersion: __APP_VERSION__,
      jwtSecret: bindings.JWT_SECRET?.trim() || undefined,
      runtimeTarget: 'cloudflare-workers',
    },
    db,
  }
}
