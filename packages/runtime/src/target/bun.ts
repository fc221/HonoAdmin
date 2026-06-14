import type { AppRuntime, RuntimeBindings } from '../types'
import { getCachedLocalRuntime } from './local-runtime'

export async function createBunRuntime(
  bindings: RuntimeBindings = {},
): Promise<AppRuntime> {
  return getCachedLocalRuntime(bindings, 'bun')
}
