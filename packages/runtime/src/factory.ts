import type { AppRuntime, RuntimeBindings, RuntimeTarget } from './types'

let localRuntimePromise: Promise<AppRuntime> | null = null

export async function createAppRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  const target = getAppRuntimeTarget()

  if (target === 'bun') {
    const { createBunRuntime } = await import('./bun')
    localRuntimePromise ??= createBunRuntime(bindings)
    return localRuntimePromise
  }

  if (target === 'node') {
    const { createNodeRuntime } = await import('./node')
    localRuntimePromise ??= createNodeRuntime(bindings)
    return localRuntimePromise
  }

  const { createCloudflareWorkersRuntime } = await import('./cloudflare-workers')
  return createCloudflareWorkersRuntime(bindings)
}

/**
 * Bun 和 Node 都从同一个 .env 起 runtime,reload 流程一致;CF Workers 不支持 in-process
 * reload(install 流程也已在 API 层 gate 掉)。
 */
export async function reloadBunRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  return reloadLocalRuntime(bindings)
}

export async function reloadLocalRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  const target = getAppRuntimeTarget()
  if (target !== 'bun' && target !== 'node') {
    throw new Error('Cloudflare Workers runtime does not support reload.')
  }

  const oldRuntime = localRuntimePromise ? await localRuntimePromise : null
  await oldRuntime?.db.close?.()

  const nextRuntimePromise = target === 'node'
    ? (await import('./node')).createNodeRuntime(bindings)
    : (await import('./bun')).createBunRuntime(bindings)
  localRuntimePromise = nextRuntimePromise

  try {
    return await nextRuntimePromise
  } catch (error) {
    if (localRuntimePromise === nextRuntimePromise) {
      localRuntimePromise = null
    }

    throw error
  }
}

function getAppRuntimeTarget(): RuntimeTarget {
  return typeof __APP_RUNTIME_TARGET__ === 'undefined'
    ? 'bun'
    : __APP_RUNTIME_TARGET__
}
