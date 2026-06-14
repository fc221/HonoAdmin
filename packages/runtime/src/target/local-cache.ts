import type { CacheAdapter } from '@hono-admin/cache'
import { MemoryCacheAdapter } from '@hono-admin/cache/adapter/memory'

interface CacheChoice {
  cacheNamespace: string
  redisUrl: string
}

/**
 * 按 REDIS_URL 是否存在,选 Redis 或本地 Memory cache。
 * Bun 和 Node 入口共用,因此这里不直接读 bindings/env,由调用方传字符串。
 */
export async function createServerCacheAdapter(input: CacheChoice): Promise<CacheAdapter> {
  const prefix = input.cacheNamespace || 'hono-admin'

  if (input.redisUrl) {
    const { createRedisCacheAdapter } = await import('@hono-admin/cache/adapter/redis')
    return createRedisCacheAdapter(input.redisUrl, { defaultTtlSeconds: 300, prefix })
  }

  return new MemoryCacheAdapter(prefix, 300)
}
