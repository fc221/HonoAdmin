import type { AppRuntime, RuntimeBindings } from './types'
import { normalizeTimezone } from '../../utils/datetime'
import { KVCacheAdapter } from '../cache/adapter/kv'
import { NoopCacheAdapter } from '../cache/adapter/noop'
import { D1Adapter } from '../database/adapter/d1'

import { UnavailableDBAdapter } from '../database/adapter/unavailable'
import { getCloudflareWorkersBootstrapConfigStatus } from './bootstrap'

export async function createCloudflareWorkersRuntime(
  bindings: RuntimeBindings,
): Promise<AppRuntime> {
  const bootstrap = getCloudflareWorkersBootstrapConfigStatus(bindings)
  const db = bindings.DB
    ? new D1Adapter(bindings.DB)
    : new UnavailableDBAdapter('Cloudflare Workers 运行时缺少 DB 绑定。')

  return {
    cache: bindings.CACHE
      ? new KVCacheAdapter(bindings.CACHE, 'honox-admin', 300)
      : new NoopCacheAdapter(),
    config: {
      appName: __APP_NAME__,
      appVersion: __APP_VERSION__,
      bootstrap,
      jwtSecret: bindings.JWT_SECRET?.trim() || undefined,
      runtimeTarget: 'cloudflare-workers',
      timezone: normalizeTimezone(bindings.APP_TIMEZONE),
    },
    db,
  }
}
