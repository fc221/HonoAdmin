import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { dashboardPayloadSchema } from '../schema'
import { requireApiSession } from '../shared/api-session'
import { getLayoutPayload } from '../shared/layout'
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

const adminApi = new Hono<AppEnv>()
const systemApi = new Hono<AppEnv>()
const webApi = new Hono<AppEnv>()

adminApi.use('*', requireApiSession)

adminApi.get('/layout', async (c) =>
  c.json(await getLayoutPayload(c, 'admin', c.req.query('activeMenuName') ?? 'admin.dashboard')))

adminApi.get('/dashboard', async (c) => {
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
})

systemApi.route('/config', systemConfigApi)
systemApi.route('/file', systemFileApi)
systemApi.route('/operate-log', systemOperateLogApi)
systemApi.route('/role', systemRoleApi)
systemApi.route('/update', systemUpdateApi)

webApi.route('/feedback', webFeedbackApi)
webApi.route('/notification', webNotificationApi)
webApi.route('/page', webPageApi)

adminApi.route('/user', adminUserApi)
adminApi.route('/system', systemApi)
adminApi.route('/web', webApi)

async function countTable(c: Context<AppEnv>, table: string): Promise<number> {
  try {
    const row = await c.db.first<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`)
    return row?.count ?? 0
  } catch {
    return 0
  }
}

export default adminApi
