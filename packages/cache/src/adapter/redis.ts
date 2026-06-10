import type { CacheAdapter, CacheSetOptions } from '../types'

interface RedisClient {
  get: (key: string) => Promise<string | null>
  set: ((key: string, value: string) => Promise<unknown>) & ((key: string, value: string, mode: 'EX', ttlSeconds: number) => Promise<unknown>)
  del: (key: string) => Promise<number>
  exists: (key: string) => Promise<number>
  quit: () => Promise<unknown>
}

interface RedisCtor {
  new (url: string): RedisClient
}

interface RedisCacheOptions {
  /** key 前缀,默认 `pdx`。 */
  prefix?: string
  /** set() 未显式给 ttl 时使用,单位秒。 */
  defaultTtlSeconds?: number
}

/**
 * 通过动态 import 拿到 ioredis,这样:
 *  - 没装 ioredis 也能 build/typecheck(它是可选适配器);
 *  - vite 不会把 ioredis 打到前端 bundle(`/* @vite-ignore *\/`)。
 */
export async function createRedisCacheAdapter(
  url: string,
  options: RedisCacheOptions = {},
): Promise<RedisCacheAdapter> {
  const ioredisModule = 'ioredis'
  const mod = await import(/* @vite-ignore */ ioredisModule) as { default: RedisCtor } | RedisCtor
  const Ctor: RedisCtor = (mod as { default?: RedisCtor }).default ?? (mod as RedisCtor)
  return new RedisCacheAdapter(new Ctor(url), options)
}

export class RedisCacheAdapter implements CacheAdapter {
  readonly kind = 'redis' as const

  constructor(
    private readonly client: RedisClient,
    private readonly options: RedisCacheOptions = {},
  ) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(this.withPrefix(key))
    if (raw === null)
      return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set<T = unknown>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    const ttl = options.ttlSeconds ?? this.options.defaultTtlSeconds
    const payload = JSON.stringify(value)
    if (ttl && ttl > 0) {
      await this.client.set(this.withPrefix(key), payload, 'EX', ttl)
      return
    }
    await this.client.set(this.withPrefix(key), payload)
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.withPrefix(key))
  }

  async has(key: string): Promise<boolean> {
    return (await this.client.exists(this.withPrefix(key))) > 0
  }

  /** 优雅关闭连接;app 进程退出/角色切换时调用。 */
  async destroy(): Promise<void> {
    await this.client.quit().catch(() => {})
  }

  private withPrefix(key: string): string {
    return `${this.options.prefix ?? 'pdx'}:${key}`
  }
}
