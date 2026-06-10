import type { AppRuntime, RuntimeBindings } from './types'
import { UnavailableDBAdapter } from '@hono-admin/db/adapter/unavailable'
import {
  getBunBootstrapConfigStatus,
  getNodeBootstrapConfigStatus,
} from './bootstrap'
import { createServerCacheAdapter } from './cache'
import { createLocalDatabaseAdapter } from './local-sqlite'
import { resolveSecurityRuntimeConfig } from './security-config'
import { normalizeTimezone } from './utils/datetime'

/**
 * Bun 和 Node 共用同一份组装逻辑;真正的运行时差异(SQLite 驱动、fs 实现、Redis 客户端)
 * 都在各 adapter 内部以 `isBunRuntime()` 之类的运行期判别自动切换。
 * 这里只负责拉 bootstrap + 选 db + 选 cache + 填 config。
 */
export async function createLocalRuntime(
  bindings: RuntimeBindings = {},
  target: 'bun' | 'node',
): Promise<AppRuntime> {
  const bootstrap = target === 'node'
    ? await getNodeBootstrapConfigStatus(bindings)
    : await getBunBootstrapConfigStatus(bindings)

  const databaseUrl = readLocalBinding(bindings, 'DATABASE_URL')
    || getBootstrapValue(bootstrap, 'DATABASE_URL')
  const cacheNamespace = readLocalBinding(bindings, 'CACHE_NAMESPACE')
    || getBootstrapValue(bootstrap, 'CACHE_NAMESPACE')
  const redisUrl = readLocalBinding(bindings, 'REDIS_URL')
  const jwtSecret = readLocalBinding(bindings, 'JWT_SECRET')
    || getBootstrapValue(bootstrap, 'JWT_SECRET')
    || undefined
  const sessionSecret = readLocalBinding(bindings, 'SESSION_SECRET')
    || getBootstrapValue(bootstrap, 'SESSION_SECRET')
    || undefined
  const timezone = normalizeTimezone(
    readLocalBinding(bindings, 'APP_TIMEZONE')
    || getBootstrapValue(bootstrap, 'APP_TIMEZONE'),
  )

  const targetLabel = target === 'node' ? 'Node' : 'Bun'
  const db = bootstrap.isConfigured
    ? await createLocalDatabaseAdapter(databaseUrl)
    : new UnavailableDBAdapter(`${targetLabel} 运行时配置尚未完成。`)

  return {
    cache: await createServerCacheAdapter({ cacheNamespace, redisUrl }),
    config: {
      appName: getAppName(),
      appVersion: getAppVersion(),
      bootstrap,
      jwtSecret,
      runtimeTarget: target,
      security: resolveSecurityRuntimeConfig((key) => readLocalBinding(bindings, key)),
      sessionSecret,
      timezone,
    },
    db,
  }
}

function readLocalBinding(bindings: RuntimeBindings, key: string): string {
  const bindingValue = bindings[key as keyof RuntimeBindings]
  return (
    typeof bindingValue === 'string' ? bindingValue.trim() : ''
  ) || process.env[key]?.trim() || ''
}

function getBootstrapValue(
  bootstrap: { requirements: ReadonlyArray<{ key: string, value?: string }> },
  key: string,
): string {
  return bootstrap.requirements.find((requirement) => requirement.key === key)
    ?.value
    ?.trim() ?? ''
}

function getAppName(): string {
  return typeof __APP_NAME__ === 'undefined' ? 'hono-admin' : __APP_NAME__
}

function getAppVersion(): string {
  return typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__
}
