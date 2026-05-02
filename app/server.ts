import { compress } from 'hono/compress'
import { showRoutes } from 'hono/dev'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { timing } from 'hono/timing'
import { createApp } from 'honox/server'
import { middleware } from './service/middleware'

const app = createApp({
  init(app) {
    app.use('*', middleware.context.attach)
    app.use('*', requestId())
    app.use('*', logger()) // 请求日志
    app.use('*', timing()) // 性能计时
    app.use('*', compress()) // Gzip/Brotli 压缩
    app.use('*', etag()) // ETag 缓存
  },
})

showRoutes(app)

export default app
