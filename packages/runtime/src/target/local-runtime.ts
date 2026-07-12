import type { DBAdapter } from '@hono-admin/db'
import type { AppRuntime, RuntimeBindings } from '../types'
import { UnavailableDBAdapter } from '@hono-admin/db/adapter/unavailable'
import {
  getBunBootstrapConfigStatus,
  getNodeBootstrapConfigStatus,
} from '../bootstrap'
import { resolveSecurityRuntimeConfig } from '../security-config'
import { getAppName, getAppVersion } from '../utils/app-meta'
import { normalizeTimezone } from '../utils/datetime'
import { createServerCacheAdapter } from './local-cache'
import { readLocalSystemMetrics } from './local-metrics'
import { createLocalDatabaseAdapter } from './local-sqlite'

type LocalRuntimeTarget = 'bun' | 'node'

let localRuntimeCache: {
  promise: Promise<AppRuntime>
  target: LocalRuntimeTarget
} | null = null

/**
 * Bun 和 Node 共用同一份组装逻辑;真正的运行时差异(SQLite 驱动、fs 实现、Redis 客户端)
 * 都在各 adapter 内部以 `isBunRuntime()` 之类的运行期判别自动切换。
 * 这里只负责拉 bootstrap + 选 db + 选 cache + 填 config。
 */
export async function getCachedLocalRuntime(
  bindings: RuntimeBindings = {},
  target: LocalRuntimeTarget,
): Promise<AppRuntime> {
  if (localRuntimeCache?.target === target) {
    return localRuntimeCache.promise
  }

  return replaceCachedLocalRuntime(bindings, target)
}

export async function reloadCachedLocalRuntime(
  bindings: RuntimeBindings = {},
  target: LocalRuntimeTarget,
): Promise<AppRuntime> {
  return replaceCachedLocalRuntime(bindings, target)
}

export async function createLocalRuntime(
  bindings: RuntimeBindings = {},
  target: LocalRuntimeTarget,
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
  const db: DBAdapter = bootstrap.isConfigured
    ? await createLocalDatabaseAdapter(databaseUrl)
    : new UnavailableDBAdapter(`${targetLabel} 运行时配置尚未完成。`)
  const cache = await createServerCacheAdapter({ cacheNamespace, redisUrl })

  return {
    cache,
    async close() {
      try {
        await db.close?.()
      } finally {
        await cache.destroy?.()
      }
    },
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
    systemMetrics: readLocalSystemMetrics,
  }
}

function replaceCachedLocalRuntime(
  bindings: RuntimeBindings,
  target: LocalRuntimeTarget,
): Promise<AppRuntime> {
  const previous = localRuntimeCache
  const nextRuntimePromise = (async () => {
    const previousRuntime = previous
      ? await previous.promise.catch(() => null)
      : null
    await closeRuntime(previousRuntime)
    return createLocalRuntime(bindings, target)
  })()

  localRuntimeCache = { promise: nextRuntimePromise, target }

  nextRuntimePromise.catch(() => {
    if (localRuntimeCache?.promise === nextRuntimePromise) {
      localRuntimeCache = null
    }
  })

  return nextRuntimePromise
}

async function closeRuntime(runtime: AppRuntime | null): Promise<void> {
  if (!runtime) return

  if (runtime.close) {
    await runtime.close()
    return
  }

  try {
    await runtime.db.close?.()
  } finally {
    await runtime.cache.destroy?.()
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
