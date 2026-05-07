import type { CacheAdapter } from '../cache/types'
import type { DBAdapter } from '../database/types'
import type { BootstrapConfigStatus } from './bootstrap'

export type RuntimeBindings = {
  CACHE_NAMESPACE?: string
  DB?: D1Database
  DATABASE_URL?: string
  CACHE?: KVNamespace
  HONO_ADMIN_ENV_FILE?: string
  JWT_SECRET?: string
  APP_TIMEZONE?: string
}

export type RuntimeTarget = 'bun' | 'cloudflare-workers'

export type AppRuntimeConfig = {
  appName: string
  appVersion: string
  bootstrap: BootstrapConfigStatus
  jwtSecret?: string
  runtimeTarget: RuntimeTarget
  timezone: string
}

export type AppRuntime = {
  cache: CacheAdapter
  config: AppRuntimeConfig
  db: DBAdapter
}

export type AppContext = {
  cache: CacheAdapter
  config: AppRuntimeConfig
  db: DBAdapter
  now: () => string
  runtime: AppRuntime
}

export type AppEnv = {
  Bindings: RuntimeBindings
  Variables: Record<string, never>
}
