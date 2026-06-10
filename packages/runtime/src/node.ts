import type { AppRuntime, RuntimeBindings } from './types'
import { createLocalRuntime } from './local-runtime'

export async function createNodeRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  return createLocalRuntime(bindings, 'node')
}
