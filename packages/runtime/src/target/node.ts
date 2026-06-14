import type { AppRuntime, RuntimeBindings } from '../types'
import { getCachedLocalRuntime } from './local-runtime'

export async function createNodeRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  return getCachedLocalRuntime(bindings, 'node')
}
