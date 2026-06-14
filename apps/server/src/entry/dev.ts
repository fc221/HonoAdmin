import { createBunRuntime } from '@hono-admin/runtime/bun'
import app, { setApiRuntimeContextMiddleware } from '../app'
import { createAttachRuntime } from '../service/middleware/context'

setApiRuntimeContextMiddleware(createAttachRuntime(createBunRuntime))

export default app
