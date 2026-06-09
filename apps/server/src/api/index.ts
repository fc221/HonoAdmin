import type { AppEnv } from '@hono-admin/runtime'
import { Hono } from 'hono'
import { z } from 'zod'
import adminApi from './admin'
import authApi from './auth'
import installApi from './install'
import { describeRoute, jsonResponse } from './shared/openapi'
import userApi from './user'

const api = new Hono<AppEnv>()

const healthPayloadSchema = z.object({
  app: z.string(),
  ok: z.boolean(),
  runtime: z.enum(['bun', 'cloudflare-workers']),
  timestamp: z.number(),
})

api.get(
  '/health',
  describeRoute({
    tags: ['system'],
    summary: '运行时健康检查',
    responses: { 200: jsonResponse(healthPayloadSchema, '健康检查') },
  }),
  (c) =>
    c.json({
      app: 'hono-admin',
      ok: true,
      runtime: c.config.runtimeTarget,
      timestamp: c.now(),
    }),
)

api.route('/auth', authApi)
api.route('/install', installApi)
api.route('/admin', adminApi)
api.route('/user', userApi)

export default api
