import app, { setApiRuntimeContextMiddleware } from './app'
import { middleware } from './service/middleware'

setApiRuntimeContextMiddleware(middleware.context.attach)

export default app
