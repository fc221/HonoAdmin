import type { CacheAdapter } from '@hono-admin/cache'
import type { DBAdapter } from '@hono-admin/db'
import type { BootstrapConfigStatus } from './bootstrap'
import type { SecurityRuntimeConfig } from './security-config'

export type RuntimeBindings = {
  CACHE_NAMESPACE?: string
  DB?: D1Database
  DATABASE_URL?: string
  CACHE?: KVNamespace
  HONO_ADMIN_ENV_FILE?: string
  JWT_SECRET?: string
  REDIS_URL?: string
  SESSION_SECRET?: string
  APP_TIMEZONE?: string
  API_RATE_LIMIT_MAX?: string
  API_RATE_LIMIT_WINDOW_SECONDS?: string
  LOGIN_RATE_LIMIT_ACCOUNT_MAX?: string
  LOGIN_RATE_LIMIT_IP_MAX?: string
  LOGIN_RATE_LIMIT_WINDOW_SECONDS?: string
  REQUEST_BODY_LIMIT_BYTES?: string
  UPLOAD_IMAGE_LIMIT_BYTES?: string
  DEMO_MODE?: string
}

export type RuntimeTarget = 'bun' | 'cloudflare-workers' | 'node'

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

export type SystemMetrics = {
  cpuCores: number
  cpuLoad: number
  cpuLoadPercent: number
  memoryTotal: number
  memoryUsed: number
  memoryUsedPercent: number
  processMemory: number
  storageTotal: number
  storageUsed: number
  storageUsedPercent: number
  uptimeSeconds: number
}

export type AppRuntime = {
  cache: CacheAdapter
  close?: () => Promise<void> | void
  config: AppRuntimeConfig
  db: DBAdapter
  // 只有能读到宿主机指标的运行时才实现(Bun / Node);Workers 上没有 os/fs,直接不提供。
  systemMetrics?: () => Promise<SystemMetrics | null>
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
