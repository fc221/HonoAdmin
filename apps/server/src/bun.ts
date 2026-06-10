import type { CachePolicy } from './static'
import app, { setApiRuntimeContextMiddleware } from './app'
import { middleware } from './service/middleware'
import {
  buildCacheControl,
  buildEtag,
  classifyStaticPath,
  isApiOrUpload,
  normalizeRelativePath,
} from './static'

const port = Number(process.env.PORT ?? 3000)
// 静态资源锚点:
//  - `bun apps/server/dist/bun.js`:`import.meta.url` 指向 bun.js,static 在它的兄弟目录;
//  - `bun build --compile` 出的单文件:`import.meta.url` 是虚拟路径 `/$bunfs/root/bun.js`,
//    实际 static 跟在二进制旁,改用 `process.execPath` 做锚点。
// 都要求 `static/{console,public}` 与 bun.js 或编译二进制同级,由 scripts/build.ts 写入。
const staticBase = import.meta.url.includes('/$bunfs/')
  ? new URL(`file://${process.execPath}`)
  : new URL(import.meta.url)
const distRoots = {
  console: new URL('./static/console/', staticBase),
  public: new URL('./static/public/', staticBase),
}

setApiRuntimeContextMiddleware(middleware.context.attach)

Bun.serve({
  async fetch(request, server) {
    const url = new URL(request.url)

    if (isApiOrUpload(url.pathname)) {
      return app.fetch(request, server)
    }

    const decision = classifyStaticPath(url.pathname)
    const root = distRoots[decision.root]
    const relativePath = normalizeRelativePath(url.pathname)
    if (relativePath === null) {
      return new Response('Not Found', { status: 404 })
    }

    const file = Bun.file(new URL(relativePath, root))
    if (await file.exists()) {
      return serveBunFile(file, request, decision.policy)
    }

    if (decision.fallbackToIndex) {
      return serveBunFile(Bun.file(new URL('index.html', root)), request, 'revalidate')
    }
    return new Response('Not Found', { status: 404 })
  },
  port,
})

console.log(`HonoAdmin API listening on http://127.0.0.1:${port}`)

async function serveBunFile(
  file: Bun.BunFile,
  request: Request,
  policy: CachePolicy,
): Promise<Response> {
  const etag = buildEtag(file.size, file.lastModified)

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  return new Response(file, {
    headers: { 'Cache-Control': buildCacheControl(policy), 'ETag': etag },
  })
}
