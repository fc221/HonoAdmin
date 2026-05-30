import type { CacheAdapter, CacheSetOptions } from '../types'

type MemoryEntry = {
  expiresAt?: number
  value: unknown
}

const DEFAULT_MAX_ENTRIES = 2048
const DEFAULT_CLEANUP_INTERVAL_MS = 60_000

export class MemoryCacheAdapter implements CacheAdapter {
  readonly kind = 'memory' as const
  private readonly store = new Map<string, MemoryEntry>()
  private readonly maxEntries: number
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prefix = 'pdx',
    private readonly defaultTtlSeconds?: number,
    options?: {
      maxEntries?: number
      cleanupIntervalMs?: number
    },
  ) {
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES

    if (options?.cleanupIntervalMs !== 0) {
      const interval = options?.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS
      this.cleanupTimer = setInterval(() => this.evictExpired(), interval)
      if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
        this.cleanupTimer.unref()
      }
    }
  }

  async has(key: string): Promise<boolean> {
    const fullKey = this.withPrefix(key)
    const entry = this.store.get(fullKey)
    if (!entry) return false
    if (this.isExpired(entry)) {
      this.store.delete(fullKey)
      return false
    }
    return true
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const fullKey = this.withPrefix(key)
    const entry = this.store.get(fullKey)
    if (!entry) return null
    if (this.isExpired(entry)) {
      this.store.delete(fullKey)
      return null
    }
    return entry.value as T
  }

  async set<T = unknown>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    const ttlSeconds = options.ttlSeconds ?? this.defaultTtlSeconds
    const fullKey = this.withPrefix(key)

    if (this.store.size >= this.maxEntries && !this.store.has(fullKey)) {
      this.evictExpired()
      if (this.store.size >= this.maxEntries) {
        const oldest = this.store.keys().next().value
        if (oldest !== undefined) this.store.delete(oldest)
      }
    }

    this.store.set(fullKey, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(this.withPrefix(key))
  }

  private isExpired(entry: MemoryEntry): boolean {
    return !!entry.expiresAt && entry.expiresAt <= Date.now()
  }

  private withPrefix(key: string): string {
    return `${this.prefix}:${key}`
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /** Stop the background cleanup timer. Call in test teardown or graceful shutdown. */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}
