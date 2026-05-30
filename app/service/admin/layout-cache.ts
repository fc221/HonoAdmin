import type { ServiceContext } from '../types'
import { buildCacheKey } from '../../infra/cache/types'
import { devWarn } from '../../utils/log'

const adminLayoutCacheVersionKey = buildCacheKey('system', 'layout', 'version')
export const adminLayoutCacheTtlSeconds = 60

export async function getAdminLayoutCacheVersion(
  ctx: ServiceContext,
): Promise<string> {
  try {
    const cached = await ctx.cache.get<string>(adminLayoutCacheVersionKey)
    return cached || '1'
  } catch (e) {
    devWarn('layout-cache: get version failed', e)
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
  } catch (e) {
    devWarn('layout-cache: bump version failed', e)
  }
}
