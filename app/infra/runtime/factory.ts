import type { AppRuntime, RuntimeBindings } from './types'

let bunRuntimePromise: Promise<AppRuntime> | null = null

export async function createAppRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  if (__APP_RUNTIME_TARGET__ === 'bun') {
    const { createBunRuntime } = await import('./bun')
    bunRuntimePromise ??= createBunRuntime(bindings)
    return bunRuntimePromise
  }

  const { createCloudflareWorkersRuntime } = await import('./cloudflare-workers')
  return createCloudflareWorkersRuntime(bindings)
}
