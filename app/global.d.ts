import type {} from 'hono'
import type { Child } from 'hono/jsx'
import type {
  AppContext,
  AppEnv,
  RuntimeBindings,
} from './infra/runtime/types'
import type { LayoutRenderOptions } from './routes/_utils/layout'

declare module 'hono' {
  interface ContextRenderer {
    (
      content: Child | Promise<Child>,
      options?: LayoutRenderOptions,
    ): Response | Promise<Response>
  }

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
