export interface CacheSetOptions {
  ttlSeconds?: number
}

export interface CacheAdapter {
  readonly kind: 'memory' | 'kv' | 'noop'
  get: <T = unknown>(key: string) => Promise<T | null>
  set: <T = unknown>(key: string, value: T, options?: CacheSetOptions) => Promise<void>
  delete: (key: string) => Promise<void>
  has: (key: string) => Promise<boolean>
}

/** 统一拼接缓存命名空间和业务段，避免手写 key 分隔规则。 */
export function buildCacheKey(namespace: string, ...segments: Array<string | number>): string {
  return [namespace, ...segments].join(':')
}
