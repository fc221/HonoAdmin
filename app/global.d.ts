import type {} from 'hono'
import type {
  AppContext,
  AppEnv,
  RuntimeBindings,
} from './infra/runtime/types'

declare module 'hono' {
  interface Context extends AppContext {}

  interface Env {
    Bindings: RuntimeBindings
    Variables: AppEnv['Variables']
  }
}

declare global {
  const __APP_NAME__: string
  const __APP_VERSION__: string
  const __APP_RUNTIME_TARGET__: 'bun' | 'cloudflare-workers'
}
