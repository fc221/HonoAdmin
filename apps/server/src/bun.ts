import app, { setApiRuntimeContextMiddleware } from './app'
import { middleware } from './service/middleware'

const port = Number(process.env.PORT ?? 3000)
// 静态资源锚点:
//  - `bun apps/server/dist/bun.js`:`import.meta.url` 指向 bun.js,static 在它的兄弟目录;
//  - `bun build --compile` 出的单文件:`import.meta.url` 是虚拟路径 `/$bunfs/root/bun.js`,
//    实际 static 跟在二进制旁,改用 `process.execPath` 做锚点。
// 都要求 `static/{console,public}` 与 bun.js 或编译二进制同级,由 scripts/build.ts 写入。
const staticBase = import.meta.url.includes('/$bunfs/')
  ? new URL(`file://${process.execPath}`)
  : new URL(import.meta.url)
const consoleDist = new URL('./static/console/', staticBase)
const publicDist = new URL('./static/public/', staticBase)

setApiRuntimeContextMiddleware(middleware.context.attach)

Bun.serve({
  async fetch(request, server) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
      return app.fetch(request, server)
    }

    if (url.pathname === '/install' || url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      return serveSpa(consoleDist, url.pathname, request)
    }

    if (url.pathname === '/user' || url.pathname.startsWith('/user/')) {
      return serveSpa(consoleDist, url.pathname, request)
    }

    // SPA 把 JS/CSS/图片以 /assets/* 引用,直接走 console 的资源目录,落空 404 不要兜底 SPA index。
    if (url.pathname.startsWith('/assets/')) {
      return serveStatic(consoleDist, url.pathname, request, false)
    }

    return serveStatic(publicDist, url.pathname, request, true)
  },
  port,
})

console.log(`HonoAdmin API listening on http://127.0.0.1:${port}`)

async function serveSpa(root: URL, pathname: string, request: Request): Promise<Response> {
  const response = await serveStatic(root, pathname, request, false)
  if (response.status !== 404) {
    return response
  }

  return serveIndex(root, request)
}

async function serveStatic(
  root: URL,
  pathname: string,
  request: Request,
  fallbackToIndex: boolean,
): Promise<Response> {
  const relativePath = decodeURIComponent(pathname.replace(/^\/+/, '')) || 'index.html'

  if (relativePath.includes('..')) {
    return new Response('Not Found', { status: 404 })
  }

  const file = Bun.file(new URL(relativePath, root))
  if (await file.exists()) {
    // vite 把入口资源放在 /assets/* 且文件名带 hash → 可永久缓存;其他(主要是 index.html)
    // 走 no-cache,浏览器每次回源 + 用 ETag 304 省带宽。
    const policy: CachePolicy = pathname.startsWith('/assets/') ? 'immutable' : 'revalidate'
    return serveFile(file, request, policy)
  }

  return fallbackToIndex ? serveIndex(root, request) : new Response('Not Found', { status: 404 })
}

function serveIndex(root: URL, request: Request): Promise<Response> {
  return serveFile(Bun.file(new URL('index.html', root)), request, 'revalidate')
}

type CachePolicy = 'immutable' | 'revalidate'

async function serveFile(file: Bun.BunFile, request: Request, policy: CachePolicy): Promise<Response> {
  // 弱 ETag: size + lastModified 的十六进制,够区分内容变化,且没有读文件计算 hash 的开销。
  const etag = `W/"${file.size.toString(16)}-${Math.floor(file.lastModified).toString(16)}"`

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  const cacheControl = policy === 'immutable'
    ? 'public, max-age=31536000, immutable'
    : 'no-cache'

  return new Response(file, {
    headers: { 'Cache-Control': cacheControl, 'ETag': etag },
  })
}
