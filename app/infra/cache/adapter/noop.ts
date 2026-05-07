import type { CacheAdapter, CacheSetOptions } from '../types'

export class NoopCacheAdapter implements CacheAdapter {
  readonly kind = 'noop' as const

  /** No-op 适配器永远报告缓存未命中。 */
  async has(_key: string): Promise<boolean> {
    return false
  }

  /** No-op 适配器读取时始终返回空值。 */
  async get<T = unknown>(_key: string): Promise<T | null> {
    return null
  }

  /** No-op 适配器忽略所有写入操作。 */
  async set<T = unknown>(_key: string, _value: T, _options: CacheSetOptions = {}): Promise<void> {}

  /** No-op 适配器忽略所有删除操作。 */
  async delete(_key: string): Promise<void> {}
}
