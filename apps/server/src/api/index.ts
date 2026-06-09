import type { AppEnv } from '@hono-admin/runtime'
import { Hono } from 'hono'
import adminApi from './admin'
import authApi from './auth'
import installApi from './install'
import { openApiDocument } from './openapi'
import userApi from './user'

const api = new Hono<AppEnv>()

api.get('/health', (c) =>
  c.json({
    app: 'hono-admin',
    ok: true,
    runtime: c.config.runtimeTarget,
    timestamp: c.now(),
  }))

api.get('/openapi.json', (c) => c.json(openApiDocument))
api.route('/auth', authApi)
api.route('/install', installApi)
api.route('/admin', adminApi)
api.route('/user', userApi)

export default api
