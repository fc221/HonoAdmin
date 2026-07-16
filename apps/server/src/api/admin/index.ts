import type { AppEnv } from '@hono-admin/runtime'
import { Hono } from 'hono'
import { getAdminDashboardData } from '../../service/admin/dashboard'
import { dashboardPayloadSchema, layoutPayloadSchema } from '../schema'
import { requireApiSession } from '../shared/api-session'
import { getLayoutPayload } from '../shared/layout'
import { describeRoute, jsonResponse } from '../shared/openapi'
import {
  systemConfigApi,
  systemCronApi,
  systemFileApi,
  systemOperateLogApi,
  systemRoleApi,
  systemUpdateApi,
  systemUserApi,
} from './system'
import {
  webFeedbackApi,
  webNotificationApi,
  webPageApi,
} from './web'

const systemApi = new Hono<AppEnv>()
  .route('/config', systemConfigApi)
  .route('/cron', systemCronApi)
  .route('/file', systemFileApi)
  .route('/operate-log', systemOperateLogApi)
  .route('/role', systemRoleApi)
  .route('/update', systemUpdateApi)
  .route('/user', systemUserApi)

const webApi = new Hono<AppEnv>()
  .route('/feedback', webFeedbackApi)
  .route('/notification', webNotificationApi)
  .route('/page', webPageApi)

const adminApi = new Hono<AppEnv>()
  .use('*', requireApiSession)
  .get(
    '/layout',
    describeRoute({
      tags: ['layout'],
      summary: '后台布局',
      responses: { 200: jsonResponse(layoutPayloadSchema, '布局数据') },
    }),
    async (c) => c.json(await getLayoutPayload(c, 'admin')),
  )
  .get(
    '/dashboard',
    describeRoute({
      tags: ['dashboard'],
      summary: '后台仪表盘',
      responses: { 200: jsonResponse(dashboardPayloadSchema, '仪表盘数据') },
    }),
    async (c) => c.json(dashboardPayloadSchema.parse({
      ...await getAdminDashboardData(c),
      title: '后台仪表盘',
    })),
  )
  .route('/system', systemApi)
  .route('/web', webApi)

export default adminApi
