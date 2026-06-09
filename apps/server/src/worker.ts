import type { AppEnv } from '@hono-admin/runtime'
import { createCloudflareWorkersRuntime } from '@hono-admin/runtime/cloudflare-workers'
import { env } from 'hono/adapter'
import { createMiddleware } from 'hono/factory'
import app, { setApiRuntimeContextMiddleware } from './app'

const attachWorkersRuntime = createMiddleware<AppEnv>(async (c, next) => {
  const runtime = await createCloudflareWorkersRuntime(env(c))
  const requestNow = Date.now()

  c.runtime = runtime
  c.db = runtime.db
  c.cache = runtime.cache
  c.config = runtime.config
  c.now = () => requestNow

  await next()
})

setApiRuntimeContextMiddleware(attachWorkersRuntime)

export default app
