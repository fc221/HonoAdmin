import type { CacheAdapter } from '@hono-admin/cache'
import { MemoryCacheAdapter } from '@hono-admin/cache/adapter/memory'

/**
 * 限流计数器的专用后备存储。
 *
 * 只有 Redis 是跨实例共享的:分布式限流必须走它。其余一律用这个独立的进程内缓存,而不是复用
 * 请求缓存(c.cache)—— 限流 key 是「每 IP 一条」的高基数数据,且客户端可伪造转发头凭空造 key,
 * 若和会话 / layout 版本号挤在同一个内存缓存里,会把登录态 key 挤出去导致缓存雪崩、回源查库风暴。
 * 独立缓存把这条爆炸半径和会话隔离开。
 * 代价:跨 isolate / 实例不共享,阈值按实例计;要精确的全局限流就配 REDIS_URL。
 * 定时清理关掉:Workers 的 timer 不保证在请求外触发,靠惰性过期 + FIFO 淘汰即可。
 */
const localRateLimitCache = new MemoryCacheAdapter('rate-limit', 60, {
  cleanupIntervalMs: 0,
  maxEntries: 8192,
})

export function getRateLimitCache(cache: CacheAdapter): CacheAdapter {
  return cache.kind === 'redis' ? cache : localRateLimitCache
}
