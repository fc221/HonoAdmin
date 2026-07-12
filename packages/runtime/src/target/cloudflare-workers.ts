import type { AppRuntime, RuntimeBindings } from '../types'
import { KVCacheAdapter } from '@hono-admin/cache/adapter/kv'
import { MemoryCacheAdapter } from '@hono-admin/cache/adapter/memory'
import { D1Adapter } from '@hono-admin/db/adapter/d1'
import { UnavailableDBAdapter } from '@hono-admin/db/adapter/unavailable'

import { getCloudflareWorkersBootstrapConfigStatus } from '../bootstrap'
import { resolveSecurityRuntimeConfig } from '../security-config'
import { getAppName, getAppVersion } from '../utils/app-meta'
import { normalizeTimezone } from '../utils/datetime'

// runtime 每个请求重建一次,内存缓存必须挂在模块级才跨请求存活(同 isolate 内共享)。
// 没绑 KV 时用它兜底,免得安装检测 / 角色权限 / 限流每个请求都打一次数据库;
// 跨 isolate 不共享,要共享缓存就绑 KV。定时清理关掉:Workers 的 timer 不保证在请求外触发。
let fallbackCache: MemoryCacheAdapter | null = null

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
      : (fallbackCache ??= new MemoryCacheAdapter('hono-admin', 300, {
          cleanupIntervalMs: 0,
        })),
    config: {
      appName: getAppName(),
      appVersion: getAppVersion(),
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
