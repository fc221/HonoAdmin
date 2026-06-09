import type { AppRuntime, RuntimeBindings } from './types'
import { KVCacheAdapter } from '@hono-admin/cache/adapter/kv'
import { NoopCacheAdapter } from '@hono-admin/cache/adapter/noop'
import { D1Adapter } from '@hono-admin/db/adapter/d1'
import { UnavailableDBAdapter } from '@hono-admin/db/adapter/unavailable'

import { getCloudflareWorkersBootstrapConfigStatus } from './bootstrap'
import { resolveSecurityRuntimeConfig } from './security-config'
import { normalizeTimezone } from './utils/datetime'

export async function createCloudflareWorkersRuntime(
  bindings: RuntimeBindings,
): Promise<AppRuntime> {
  const bootstrap = getCloudflareWorkersBootstrapConfigStatus(bindings)
  const db = bindings.DB
    ? new D1Adapter(bindings.DB)
    : new UnavailableDBAdapter('Cloudflare Workers 运行时缺少 DB 绑定。')

  return {
    cache: bindings.CACHE
      ? new KVCacheAdapter(bindings.CACHE, 'hono-admin', 300)
      : new NoopCacheAdapter(),
    config: {
      appName: __APP_NAME__,
      appVersion: __APP_VERSION__,
      bootstrap,
      jwtSecret: bindings.JWT_SECRET?.trim() || undefined,
      runtimeTarget: 'cloudflare-workers',
      security: resolveSecurityRuntimeConfig((key) => bindings[key]?.trim()),
      sessionSecret: bindings.SESSION_SECRET?.trim() || undefined,
      timezone: normalizeTimezone(bindings.APP_TIMEZONE),
    },
    db,
  }
}
