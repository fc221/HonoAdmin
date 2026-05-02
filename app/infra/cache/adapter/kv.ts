import type { CacheAdapter, CacheSetOptions } from '..'
import { CacheError } from '../../../utils'

export class KVCacheAdapter implements CacheAdapter {
  readonly kind = 'kv' as const
  private readonly kv: KVNamespace
  private readonly prefix: string
  private readonly defaultTtlSeconds?: number

  /** 创建一个带命名空间前缀的 KV 缓存适配器。 */
  constructor(kv: KVNamespace, prefix = 'pdx', defaultTtlSeconds?: number) {
    this.kv = kv
    this.prefix = prefix
    this.defaultTtlSeconds = defaultTtlSeconds
  }

  /** 判断指定缓存键当前是否存在。 */
  async has(key: string): Promise<boolean> {
    const value = await this.kv.get(this.withPrefix(key))
    return value !== null
  }

  /** 从 Cloudflare KV 读取 JSON 值。 */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      return this.kv.get<T>(this.withPrefix(key), 'json')
    } catch (error) {
      throw new CacheError('failed to read from Cloudflare KV', {
        cause: error,
        key,
      })
    }
  }

  /** 把值写入 Cloudflare KV，并附带可选 TTL。 */
  async set<T = unknown>(
    key: string,
    value: T,
    options: CacheSetOptions = {},
  ): Promise<void> {
    try {
      await this.kv.put(this.withPrefix(key), JSON.stringify(value), {
        expirationTtl: options.ttlSeconds ?? this.defaultTtlSeconds,
      })
    } catch (error) {
      throw new CacheError('failed to write to Cloudflare KV', {
        cause: error,
        key,
      })
    }
  }

  /** 删除 Cloudflare KV 中的指定键。 */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(this.withPrefix(key))
    } catch (error) {
      throw new CacheError('failed to delete from Cloudflare KV', {
        cause: error,
        key,
      })
    }
  }

  /** 为业务键追加统一命名空间前缀。 */
  private withPrefix(key: string): string {
    return `${this.prefix}:${key}`
  }
}
