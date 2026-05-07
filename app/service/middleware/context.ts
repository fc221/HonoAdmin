import type { AppEnv } from '../../infra/runtime/types'
import { env } from 'hono/adapter'
import { createMiddleware } from 'hono/factory'

import { createAppRuntime } from '../../infra/runtime/factory'
import { nowInTimezone } from '../../utils/datetime'

export const attach = createMiddleware<AppEnv>(async (c, next) => {
  const runtime = await createAppRuntime(env(c))

  c.runtime = runtime
  c.db = runtime.db
  c.cache = runtime.cache
  c.config = runtime.config
  c.now = () => nowInTimezone(runtime.config.timezone)

  await next()
})
