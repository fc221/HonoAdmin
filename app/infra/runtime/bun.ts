import type { AppRuntime, RuntimeBindings } from './types'
import { normalizeTimezone } from '../../utils/datetime'
import { MemoryCacheAdapter } from '../cache/adapter/memory'
import { UnavailableDBAdapter } from '../database/adapter/unavailable'

import { getBunBootstrapConfigStatus } from './bootstrap'
import { createLocalDatabaseAdapter } from './local-sqlite'
import { resolveSecurityRuntimeConfig } from './security-config'

export async function createBunRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  const bootstrap = await getBunBootstrapConfigStatus(bindings)
  const databaseUrl = readLocalBinding(bindings, 'DATABASE_URL')
    || getBootstrapValue(bootstrap, 'DATABASE_URL')
  const cacheNamespace = readLocalBinding(bindings, 'CACHE_NAMESPACE')
    || getBootstrapValue(bootstrap, 'CACHE_NAMESPACE')
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
  const db = bootstrap.isConfigured
    ? await createLocalDatabaseAdapter(databaseUrl)
    : new UnavailableDBAdapter('Bun 运行时配置尚未完成。')

  return {
    cache: new MemoryCacheAdapter(cacheNamespace || 'honox-admin', 300),
    config: {
      appName: getAppName(),
      appVersion: getAppVersion(),
      bootstrap,
      jwtSecret,
      runtimeTarget: 'bun',
      security: resolveSecurityRuntimeConfig((key) => readLocalBinding(bindings, key)),
      sessionSecret,
      timezone,
    },
    db,
  }
}

function readLocalBinding(
  bindings: RuntimeBindings,
  key: string,
): string {
  const bindingValue = bindings[key as keyof RuntimeBindings]
  return (
    typeof bindingValue === 'string' ? bindingValue.trim() : ''
  ) || process.env[key]?.trim() || ''
}

function getBootstrapValue(
  bootstrap: Awaited<ReturnType<typeof getBunBootstrapConfigStatus>>,
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
