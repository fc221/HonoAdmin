import { createBunRuntime } from '@hono-admin/runtime/bun'
import app, { setApiRuntimeContextMiddleware } from '../app'
import { startLocalScheduler } from '../service/admin/system/cron'
import { createAttachRuntime } from '../service/system/middleware/context'

setApiRuntimeContextMiddleware(createAttachRuntime(createBunRuntime))

// 开发模式同样启动定时任务心跳,行为与 bun/node 生产入口一致。
void createBunRuntime({})
  .then(startLocalScheduler)
  .catch((error) => console.error('[scheduler] 启动失败', error))

export default app
