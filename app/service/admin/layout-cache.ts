import type { ServiceContext } from '../types'
import { buildCacheKey } from '../../infra/cache/types'

const adminLayoutCacheVersionKey = buildCacheKey('system', 'layout', 'version')
export const adminLayoutCacheTtlSeconds = 60

export async function getAdminLayoutCacheVersion(
  ctx: ServiceContext,
): Promise<string> {
  try {
    const cached = await ctx.cache.get<string>(adminLayoutCacheVersionKey)
    return cached || '1'
  } catch {
    return '1'
  }
}

export async function bumpAdminLayoutCacheVersion(
  ctx: ServiceContext,
): Promise<void> {
  try {
    await ctx.cache.set(adminLayoutCacheVersionKey, String(ctx.now()), {
      ttlSeconds: 60 * 60 * 24 * 7,
    })
  } catch {
    // Layout data is derived from SQL; failed invalidation only shortens cache value.
  }
}
