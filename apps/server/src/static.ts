/**
 * 静态资源服务的运行时无关部分:
 *   1) 把请求路径分类到正确的 dist(console / public)与缓存策略;
 *   2) 生成 ETag、Cache-Control;
 *   3) 处理 If-None-Match → 304。
 * Bun / Node 入口分别提供文件读取的实现,本模块拼装响应。
 */
export type StaticRoot = 'console' | 'public'
export type CachePolicy = 'immutable' | 'revalidate'

export interface StaticDecision {
  root: StaticRoot
  /** 落空时是否回 SPA 入口(index.html) */
  fallbackToIndex: boolean
  policy: CachePolicy
}

export function isApiOrUpload(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname.startsWith('/uploads/')
}

export function classifyStaticPath(pathname: string): StaticDecision {
  if (pathname === '/install' || pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { fallbackToIndex: true, policy: 'revalidate', root: 'console' }
  }
  if (pathname === '/user' || pathname.startsWith('/user/')) {
    return { fallbackToIndex: true, policy: 'revalidate', root: 'console' }
  }
  // SPA 把 JS/CSS/图片以 /assets/* 引用,落到 console 静态目录;名字带 hash,可永久缓存。
  if (pathname.startsWith('/assets/')) {
    return { fallbackToIndex: false, policy: 'immutable', root: 'console' }
  }
  return { fallbackToIndex: true, policy: 'revalidate', root: 'public' }
}

export function buildEtag(size: number, lastModifiedMs: number): string {
  // 弱 ETag: size + lastModified 的十六进制,够区分内容变化,且没有读文件计算 hash 的开销。
  return `W/"${size.toString(16)}-${Math.floor(lastModifiedMs).toString(16)}"`
}

export function buildCacheControl(policy: CachePolicy): string {
  return policy === 'immutable'
    ? 'public, max-age=31536000, immutable'
    : 'no-cache'
}

export function normalizeRelativePath(pathname: string): string | null {
  const trimmed = decodeURIComponent(pathname.replace(/^\/+/, '')) || 'index.html'
  if (trimmed.includes('..')) {
    return null
  }
  return trimmed
}
