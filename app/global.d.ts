import type {} from 'hono'
import type { CacheAdapter } from './infra/cache'
import type { DBAdapter } from './infra/database'
import type {
  AppRuntime,
  AppRuntimeConfig,
  RuntimeBindings,
} from './infra/runtime'

declare module 'hono' {
  interface Env {
    Bindings: RuntimeBindings
    Variables: {
      cache: CacheAdapter
      config: AppRuntimeConfig
      db: DBAdapter
      now: () => string
      runtime: AppRuntime
    }
  }
}

declare global {
  const __APP_NAME__: string
  const __APP_VERSION__: string
  const __APP_RUNTIME_TARGET__: 'bun' | 'cloudflare-workers'
}
