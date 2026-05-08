import type { AppEnv } from '../../infra/runtime/types'
import { env } from 'hono/adapter'
import { createMiddleware } from 'hono/factory'

import { createAppRuntime } from '../../infra/runtime/factory'

export const attach = createMiddleware<AppEnv>(async (c, next) => {
  const runtime = await createAppRuntime(env(c))
  const requestNow = Date.now()

  c.runtime = runtime
  c.db = runtime.db
  c.cache = runtime.cache
  c.config = runtime.config
  c.now = () => requestNow

  await next()
})
