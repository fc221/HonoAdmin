import type { CacheAdapter } from '@hono-admin/cache'
import { MemoryCacheAdapter } from '@hono-admin/cache/adapter/memory'

/**
 * 限流计数器的进程内后备存储。
 *
 * KV 每个请求写一次会直接撞上写入频率/配额限制,Noop 则根本不存;这两种运行时的限流退回这里。
 * 代价:跨 isolate / 实例不共享,阈值按实例计。要精确的全局限流就配 REDIS_URL(Redis 直接用共享缓存)。
 * 定时清理关掉:Workers 的 timer 不保证在请求外触发,靠惰性过期 + FIFO 淘汰即可。
 */
const localRateLimitCache = new MemoryCacheAdapter('rate-limit', 60, {
  cleanupIntervalMs: 0,
  maxEntries: 8192,
})

export function getRateLimitCache(cache: CacheAdapter): CacheAdapter {
  return cache.kind === 'kv' || cache.kind === 'noop' ? localRateLimitCache : cache
}
