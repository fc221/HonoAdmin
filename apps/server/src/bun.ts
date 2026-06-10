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
      return serveSpa(consoleDist, url.pathname)
    }

    if (url.pathname === '/user' || url.pathname.startsWith('/user/')) {
      return serveSpa(consoleDist, url.pathname)
    }

    // SPA 把 JS/CSS/图片以 /assets/* 引用,直接走 console 的资源目录,落空 404 不要兜底 SPA index。
    if (url.pathname.startsWith('/assets/')) {
      return serveStatic(consoleDist, url.pathname, false)
    }

    return serveStatic(publicDist, url.pathname, true)
  },
  port,
})

console.log(`HonoAdmin API listening on http://127.0.0.1:${port}`)

async function serveSpa(root: URL, pathname: string): Promise<Response> {
  const response = await serveStatic(root, pathname, false)
  if (response.status !== 404) {
    return response
  }

  return serveIndex(root)
}

async function serveStatic(root: URL, pathname: string, fallbackToIndex: boolean): Promise<Response> {
  const relativePath = decodeURIComponent(pathname.replace(/^\/+/, '')) || 'index.html'

  if (relativePath.includes('..')) {
    return new Response('Not Found', { status: 404 })
  }

  const file = Bun.file(new URL(relativePath, root))
  if (await file.exists()) {
    return new Response(file)
  }

  return fallbackToIndex ? serveIndex(root) : new Response('Not Found', { status: 404 })
}

function serveIndex(root: URL): Response {
  return new Response(Bun.file(new URL('index.html', root)))
}
