import type { RuntimeTarget } from './types'

declare global {
  const __APP_NAME__: string
  const __APP_VERSION__: string
  const __APP_RUNTIME_TARGET__: RuntimeTarget
}

export {}
