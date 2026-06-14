import type { AppEnv } from '@hono-admin/runtime'
import type { MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { Hono } from 'hono'
import { openAPIRouteHandler } from 'hono-openapi'
import { compress } from 'hono/compress'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { timing } from 'hono/timing'
import api from './api'
import { openApiDocumentation } from './api/openapi'
import { getFileAccess } from './service/admin/system/file'
import { headers, requestBodyLimit } from './service/middleware/security'
import { toErrorShape } from './utils/errors'

let runtimeContextMiddleware: MiddlewareHandler<AppEnv> | null = null

export function setApiRuntimeContextMiddleware(middleware: MiddlewareHandler<AppEnv>): void {
  runtimeContextMiddleware = middleware
}

const app = new Hono<AppEnv>()

app.use('*', headers as MiddlewareHandler<AppEnv>)
app.use('*', async (c, next) => {
  if (!runtimeContextMiddleware) {
    throw new Error('HonoAdmin API runtime context middleware is not configured.')
  }

  await runtimeContextMiddleware(c, next)
})

app.use('*', requestBodyLimit as MiddlewareHandler<AppEnv>)
app.use('*', requestId())
// hono/logger 每个请求都 console.log。Bun 下,当 stdout 的 sink 停止消费(断开的 pty、
// backpressure 的日志管道 / 容器日志驱动等),console.log 会阻塞事件循环 → 整个服务卡死,
// 只能重启恢复,且全程不涨内存/fd。生产默认关闭按请求访问日志(交给前置代理),
// 需要时设 HONO_ADMIN_ACCESS_LOG=1 显式开启。
if (import.meta.env?.DEV || process.env.HONO_ADMIN_ACCESS_LOG === '1') {
  app.use('*', logger())
}
app.use('*', timing())
app.use('*', compress())

app.onError((error, c) => {
  const errorShape = toErrorShape(error)
  return c.json(errorShape.body, errorShape.status as ContentfulStatusCode)
})

app.get('/uploads/*', async (c) => {
  const storageKey = decodeURIComponent(c.req.path.slice('/uploads/'.length))
  const access = await getFileAccess(c, storageKey)

  if (access.kind === 'redirect') {
    return c.redirect(access.url, access.status)
  }

  return new Response(access.body, {
    headers: {
      'Cache-Control': access.cacheControl ?? 'public, max-age=31536000, immutable',
      'Content-Type': access.contentType,
    },
  })
})

app.get('/api/openapi.json', openAPIRouteHandler(app, { documentation: openApiDocumentation }))
app.route('/api', api)
app.notFound((c) => c.json({ message: 'Not Found' }, 404))

export default app
