import { env } from 'hono/adapter'
import { createMiddleware } from 'hono/factory'

import { createAppRuntime } from '../../infra/runtime'

export const attach = createMiddleware(async (c, next) => {
  const runtime = await createAppRuntime(env(c))

  c.set('runtime', runtime)
  c.set('db', runtime.db)
  c.set('cache', runtime.cache)
  c.set('config', runtime.config)
  c.set('now', () => new Date().toISOString())
  await next()
})
