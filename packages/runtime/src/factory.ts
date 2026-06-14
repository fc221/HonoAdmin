import type { AppRuntime, RuntimeBindings, RuntimeTarget } from './types'

export async function createAppRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  const target = getAppRuntimeTarget()

  if (target === 'bun') {
    const { createBunRuntime } = await import('./target/bun')
    return createBunRuntime(bindings)
  }

  if (target === 'node') {
    const { createNodeRuntime } = await import('./target/node')
    return createNodeRuntime(bindings)
  }

  const { createCloudflareWorkersRuntime } = await import('./target/cloudflare-workers')
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

  const { reloadCachedLocalRuntime } = await import('./target/local-runtime')
  return reloadCachedLocalRuntime(bindings, target)
}

function getAppRuntimeTarget(): RuntimeTarget {
  return typeof __APP_RUNTIME_TARGET__ === 'undefined'
    ? 'bun'
    : __APP_RUNTIME_TARGET__
}
