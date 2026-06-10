import type { AppEnv, AppRuntime, RuntimeBindings } from '@hono-admin/runtime'
import { env } from 'hono/adapter'
import { createMiddleware } from 'hono/factory'

type RuntimeFactory = (bindings: RuntimeBindings) => Promise<AppRuntime>

/**
 * 把指定 runtime constructor 包成 Hono middleware,挂到 ctx 上。
 * 入口文件(bun.ts / node.ts / worker.ts / dev.ts)各自传入自己的 runtime constructor,
 * 这样 bundler 看到的静态图里只有当前运行时的代码,其它分支不会被吸进 bundle。
 */
export function createAttachRuntime(createRuntime: RuntimeFactory) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const runtime = await createRuntime(env(c))
    const requestNow = Date.now()

    c.runtime = runtime
    c.db = runtime.db
    c.cache = runtime.cache
    c.config = runtime.config
    c.now = () => requestNow

    await next()
  })
}
