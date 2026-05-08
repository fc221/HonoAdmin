import type { CacheAdapter } from '../cache/types'
import type { DBAdapter } from '../database/types'
import type { BootstrapConfigStatus } from './bootstrap'
import type { SecurityRuntimeConfig } from './security-config'

export type RuntimeBindings = {
  CACHE_NAMESPACE?: string
  DB?: D1Database
  DATABASE_URL?: string
  CACHE?: KVNamespace
  HONO_ADMIN_ENV_FILE?: string
  JWT_SECRET?: string
  SESSION_SECRET?: string
  APP_TIMEZONE?: string
  API_RATE_LIMIT_MAX?: string
  API_RATE_LIMIT_WINDOW_SECONDS?: string
  LOGIN_RATE_LIMIT_ACCOUNT_MAX?: string
  LOGIN_RATE_LIMIT_IP_MAX?: string
  LOGIN_RATE_LIMIT_WINDOW_SECONDS?: string
  REQUEST_BODY_LIMIT_BYTES?: string
  UPLOAD_IMAGE_LIMIT_BYTES?: string
}

export type RuntimeTarget = 'bun' | 'cloudflare-workers'

export type AppRuntimeConfig = {
  appName: string
  appVersion: string
  bootstrap: BootstrapConfigStatus
  jwtSecret?: string
  runtimeTarget: RuntimeTarget
  security: SecurityRuntimeConfig
  sessionSecret?: string
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
  now: () => number
  runtime: AppRuntime
}

export type AppEnv = {
  Bindings: RuntimeBindings
  Variables: Record<string, never>
}
