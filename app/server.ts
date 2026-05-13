import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { swaggerUI } from '@hono/swagger-ui'
import { openAPIRouteHandler } from 'hono-openapi'
import { showRoutes } from 'hono/dev'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { timing } from 'hono/timing'
import { createApp } from 'honox/server'
import { getFileAccess } from './service/admin/system/file'
import { middleware } from './service/middleware'
import { toErrorShape } from './utils/errors'

const app = createApp({
  init(app) {
    app.use('*', middleware.security.headers)
    app.use('*', middleware.context.attach)
    app.use('*', middleware.security.requestBodyLimit)
    app.use('*', requestId())
    app.use('*', logger()) // 请求日志
    app.use('*', timing()) // 性能计时
    app.use('*', etag()) // ETag 缓存
  },
})

showRoutes(app)

app.get('/openapi.json', openAPIRouteHandler(app, {
  documentation: {
    info: {
      description: 'HonoAdmin admin management API.',
      title: 'HonoAdmin Admin API',
      version: '0.0.0',
    },
    openapi: '3.1.0',
    components: {
      securitySchemes: {
        bearerAuth: {
          scheme: 'bearer',
          type: 'http',
        },
      },
    },
  },
}))

app.get('/docs', swaggerUI({ url: '/openapi.json' }))

app.get('/uploads/*', async (c) => {
  const storageKey = decodeURIComponent(c.req.path.slice('/uploads/'.length))

  try {
    const access = await getFileAccess(c, storageKey)

    if (access.kind === 'redirect') {
      c.header('Cache-Control', access.cacheControl ?? 'no-store')
      return c.redirect(access.url, access.status)
    }

    c.header('Content-Type', access.contentType)
    c.header('Cache-Control', access.cacheControl ?? 'public, max-age=31536000')
    return c.body(access.body)
  } catch (error) {
    const errorShape = toErrorShape(error)

    if (errorShape.status === 404) {
      return c.notFound()
    }

    return c.json(errorShape.body, errorShape.status as ContentfulStatusCode)
  }
})

export default app
