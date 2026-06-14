import type { ServiceContext } from '../../../types'
import { buildCacheKey } from '@hono-admin/cache'

export interface RoleCatalogEntry {
  code: string
  id: number
  name: string
}

const roleCatalogCacheKey = buildCacheKey('system', 'role', 'catalog')
const roleCatalogCacheTtlSeconds = 300

/**
 * 角色目录(id/code/name)是近乎静态的小表,却被会话鉴权 / 角色解析在每个请求里反复全表查。
 * 缓存掉它,所有「按 code 取角色」「角色选项」都从内存派生;仅在角色增删改时失效
 * (见 invalidateRoleCatalogCache)。叶子模块:只依赖 cache,避免与 role/user 形成循环。
 */
export async function getRoleCatalog(ctx: ServiceContext): Promise<RoleCatalogEntry[]> {
  const cached = await readRoleCatalogCache(ctx)
  if (cached) {
    return cached
  }

  const rows = await ctx.db.query<RoleCatalogEntry>(`
    SELECT id, code, name
    FROM sys_role
    ORDER BY id ASC
  `)

  try {
    await ctx.cache.set(roleCatalogCacheKey, rows, {
      ttlSeconds: roleCatalogCacheTtlSeconds,
    })
  } catch {
    // 缓存后端不可用时回退 SQL。
  }

  return rows
}

export async function invalidateRoleCatalogCache(ctx: ServiceContext): Promise<void> {
  try {
    await ctx.cache.delete(roleCatalogCacheKey)
  } catch {
    // 数据仍持久化在 SQL,缓存失效尽力而为。
  }
}

async function readRoleCatalogCache(
  ctx: ServiceContext,
): Promise<RoleCatalogEntry[] | null> {
  try {
    const cached = await ctx.cache.get<RoleCatalogEntry[]>(roleCatalogCacheKey)
    return Array.isArray(cached) ? cached : null
  } catch {
    return null
  }
}
