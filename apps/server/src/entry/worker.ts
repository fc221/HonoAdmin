import { createCloudflareWorkersRuntime } from '@hono-admin/runtime/cloudflare-workers'
import app, { setApiRuntimeContextMiddleware } from '../app'
import { createAttachRuntime } from '../service/middleware/context'

setApiRuntimeContextMiddleware(createAttachRuntime(createCloudflareWorkersRuntime))

export default app
