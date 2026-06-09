import type { AppEnv } from '@hono-admin/runtime'
import { createAppRuntime } from '@hono-admin/runtime/factory'
import { env } from 'hono/adapter'

import { createMiddleware } from 'hono/factory'

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
