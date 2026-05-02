import type { CacheAdapter, CacheSetOptions } from '..'

type MemoryEntry = {
  expiresAt?: number
  value: unknown
}

export class MemoryCacheAdapter implements CacheAdapter {
  readonly kind = 'memory' as const
  private readonly store = new Map<string, MemoryEntry>()

  /** 创建一个基于内存 Map 的缓存适配器。 */
  constructor(
    private readonly prefix = 'pdx',
    private readonly defaultTtlSeconds?: number,
  ) {}

  /** 判断缓存键是否存在且尚未过期。 */
  async has(key: string): Promise<boolean> {
    const entry = this.store.get(this.withPrefix(key))

    if (!entry) {
      return false
    }

    if (this.isExpired(entry)) {
      this.store.delete(this.withPrefix(key))
      return false
    }

    return true
  }

  /** 读取缓存值，并在命中过期项时顺手清理。 */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(this.withPrefix(key))

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.store.delete(this.withPrefix(key))
      return null
    }

    return entry.value as T
  }

  /** 写入缓存值，并根据 TTL 计算过期时间。 */
  async set<T = unknown>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    const ttlSeconds = options.ttlSeconds ?? this.defaultTtlSeconds
    this.store.set(this.withPrefix(key), {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    })
  }

  /** 删除指定缓存键。 */
  async delete(key: string): Promise<void> {
    this.store.delete(this.withPrefix(key))
  }

  /** 判断内存项是否已经过期。 */
  private isExpired(entry: MemoryEntry): boolean {
    return !!entry.expiresAt && entry.expiresAt <= Date.now()
  }

  /** 为业务键追加统一命名空间前缀。 */
  private withPrefix(key: string): string {
    return `${this.prefix}:${key}`
  }
}
