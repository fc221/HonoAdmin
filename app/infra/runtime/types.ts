import type { CacheAdapter } from '../cache'
import type { DBAdapter } from '../database'

export type RuntimeBindings = {
  CACHE_NAMESPACE?: string
  DB?: D1Database
  DATABASE_URL?: string
  CACHE?: KVNamespace
  JWT_SECRET?: string
}

export type RuntimeTarget = 'bun' | 'cloudflare-workers'

export type AppRuntimeConfig = {
  appName: string
  appVersion: string
  jwtSecret?: string
  runtimeTarget: RuntimeTarget
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
