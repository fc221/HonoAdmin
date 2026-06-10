import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { dashboardPayloadSchema, layoutPayloadSchema } from '../schema'
import { requireApiSession } from '../shared/api-session'
import { getLayoutPayload } from '../shared/layout'
import { describeRoute, jsonResponse } from '../shared/openapi'
import {
  adminUserApi,
  systemConfigApi,
  systemFileApi,
  systemOperateLogApi,
  systemRoleApi,
  systemUpdateApi,
} from './system'
import {
  webFeedbackApi,
  webNotificationApi,
  webPageApi,
} from './web'

const systemApi = new Hono<AppEnv>()
  .route('/config', systemConfigApi)
  .route('/file', systemFileApi)
  .route('/operate-log', systemOperateLogApi)
  .route('/role', systemRoleApi)
  .route('/update', systemUpdateApi)

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
    async (c) => {
      const [users, roles, configs, pages] = await Promise.all([
        countTable(c, 'sys_user'),
        countTable(c, 'sys_role'),
        countTable(c, 'sys_config'),
        countTable(c, 'web_page'),
      ])

      return c.json(dashboardPayloadSchema.parse({
        title: '后台仪表盘',
        stats: [
          { label: '用户', tone: 'primary', value: String(users) },
          { label: '角色', tone: 'success', value: String(roles) },
          { label: '配置项', tone: 'default', value: String(configs) },
          { label: '页面', tone: 'warning', value: String(pages) },
        ],
      }))
    },
  )
  .route('/user', adminUserApi)
  .route('/system', systemApi)
  .route('/web', webApi)

async function countTable(c: Context<AppEnv>, table: string): Promise<number> {
  try {
    const row = await c.db.first<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`)
    return row?.count ?? 0
  } catch {
    return 0
  }
}

export default adminApi
