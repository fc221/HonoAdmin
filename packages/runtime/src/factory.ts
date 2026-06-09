import type { AppRuntime, RuntimeBindings, RuntimeTarget } from './types'

let bunRuntimePromise: Promise<AppRuntime> | null = null

export async function createAppRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  if (getAppRuntimeTarget() === 'bun') {
    const { createBunRuntime } = await import('./bun')
    bunRuntimePromise ??= createBunRuntime(bindings)
    return bunRuntimePromise
  }

  const { createCloudflareWorkersRuntime } = await import('./cloudflare-workers')
  return createCloudflareWorkersRuntime(bindings)
}

export async function reloadBunRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  if (getAppRuntimeTarget() !== 'bun') {
    throw new Error('Cloudflare Workers runtime does not support reload.')
  }

  const oldRuntime = bunRuntimePromise ? await bunRuntimePromise : null
  await oldRuntime?.db.close?.()

  const { createBunRuntime } = await import('./bun')
  const nextRuntimePromise = createBunRuntime(bindings)
  bunRuntimePromise = nextRuntimePromise

  try {
    return await nextRuntimePromise
  } catch (error) {
    if (bunRuntimePromise === nextRuntimePromise) {
      bunRuntimePromise = null
    }

    throw error
  }
}

function getAppRuntimeTarget(): RuntimeTarget {
  return typeof __APP_RUNTIME_TARGET__ === 'undefined'
    ? 'bun'
    : __APP_RUNTIME_TARGET__
}
