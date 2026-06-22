import type { AppEnv } from '@hono-admin/runtime'
import { Hono } from 'hono'
import { z } from 'zod'
import adminApi from './admin'
import authApi from './auth'
import installApi from './install'
import { describeRoute, jsonResponse } from './shared/openapi'
import userApi from './user'

const healthPayloadSchema = z.object({
  app: z.string(),
  ok: z.boolean(),
  timestamp: z.number(),
})

const api = new Hono<AppEnv>()
  .get(
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
        timestamp: c.now(),
      }),
  )
  .route('/auth', authApi)
  .route('/install', installApi)
  .route('/admin', adminApi)
  .route('/user', userApi)

export type AppType = typeof api

export default api
