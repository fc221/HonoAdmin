import type { RuntimeBindings } from '@hono-admin/runtime'
import { createCloudflareWorkersRuntime } from '@hono-admin/runtime/cloudflare-workers'
import app, { setApiRuntimeContextMiddleware } from '../app'
import { runSchedulerTick } from '../service/admin/system/cron'
import { createAttachRuntime } from '../service/middleware/context'

setApiRuntimeContextMiddleware(createAttachRuntime(createCloudflareWorkersRuntime))

export default {
  fetch: app.fetch,
  // Cloudflare Cron Trigger 到点触发(wrangler triggers.crons 配 "* * * * *" 心跳)。
  // 不经过 HTTP:用 scheduled 事件的 env 绑定构造运行时,直接执行到点任务。
  async scheduled(
    _controller: ScheduledController,
    env: RuntimeBindings,
    ctx: ExecutionContext,
  ): Promise<void> {
    const runtime = await createCloudflareWorkersRuntime(env)
    ctx.waitUntil(runSchedulerTick(runtime))
  },
}
