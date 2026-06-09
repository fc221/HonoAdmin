import app, { setApiRuntimeContextMiddleware } from './app'
import { middleware } from './service/middleware'

const port = Number(process.env.PORT ?? 3000)
const consoleDist = new URL('../../console/dist/', import.meta.url)
const publicDist = new URL('../../public/dist/', import.meta.url)

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
