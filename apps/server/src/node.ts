import type { Stats } from 'node:fs'
import type { CachePolicy } from './static'
import { readFile, stat } from 'node:fs/promises'
import { serve } from '@hono/node-server'
import { getMimeType } from 'hono/utils/mime'
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
const staticBase = new URL('./static/', import.meta.url)
const distRoots = {
  console: new URL('./console/', staticBase),
  public: new URL('./public/', staticBase),
}

setApiRuntimeContextMiddleware(middleware.context.attach)

// Node 入口:Hono app 在 `app.route('/api', api)` 之后再补一段静态资源中间件;
// `*` 通配在最末,/api/* 仍走子应用,不会被吞。
app.use('*', async (c, next) => {
  if (isApiOrUpload(new URL(c.req.url).pathname)) {
    return next()
  }

  const pathname = new URL(c.req.url).pathname
  const decision = classifyStaticPath(pathname)
  const root = distRoots[decision.root]
  const relativePath = normalizeRelativePath(pathname)
  if (relativePath === null) {
    return c.notFound()
  }

  const filePath = new URL(relativePath, root)
  const fileStat = await statOrNull(filePath)
  if (fileStat?.isFile()) {
    return serveNodeFile(c.req.raw, filePath, fileStat, decision.policy)
  }

  if (decision.fallbackToIndex) {
    const indexUrl = new URL('index.html', root)
    const indexStat = await statOrNull(indexUrl)
    if (indexStat?.isFile()) {
      return serveNodeFile(c.req.raw, indexUrl, indexStat, 'revalidate')
    }
  }

  return c.notFound()
})

serve({ fetch: app.fetch, port })
console.log(`HonoAdmin API listening on http://127.0.0.1:${port}`)

async function statOrNull(filePath: URL): Promise<Stats | null> {
  try {
    return await stat(filePath)
  } catch {
    return null
  }
}

async function serveNodeFile(
  request: Request,
  filePath: URL,
  fileStat: Stats,
  policy: CachePolicy,
): Promise<Response> {
  const etag = buildEtag(fileStat.size, fileStat.mtimeMs)

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  const body = await readFile(filePath)
  const headers: Record<string, string> = {
    'Cache-Control': buildCacheControl(policy),
    'ETag': etag,
  }
  const mime = getMimeType(filePath.pathname)
  if (mime) {
    headers['Content-Type'] = mime
  }
  return new Response(body, { headers })
}
