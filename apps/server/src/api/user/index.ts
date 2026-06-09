import type { AppEnv } from '@hono-admin/runtime'
import { Hono } from 'hono'
import { getCurrentUserProfilePageData } from '../../service/user/profile'
import { dashboardPayloadSchema } from '../schema'
import { requireApiSession } from '../shared/api-session'
import { getLayoutPayload } from '../shared/layout'
import { getOptionalSessionUser } from '../shared/session'
import profileApi from './profile'

const userApi = new Hono<AppEnv>()

userApi.use('*', requireApiSession)

userApi.get('/layout', async (c) =>
  c.json(await getLayoutPayload(c, 'user', c.req.query('activeMenuName') ?? 'user.dashboard')))

userApi.get('/dashboard', async (c) => {
  const sessionUser = await getOptionalSessionUser(c)
  const profile = sessionUser ? await getCurrentUserProfilePageData(c).catch(() => null) : null

  return c.json(dashboardPayloadSchema.parse({
    title: '用户仪表盘',
    stats: [
      { label: '当前用户', tone: 'primary', value: sessionUser?.username ?? '未登录' },
      { label: '角色数', tone: 'success', value: String(sessionUser?.roleIds?.length ?? 0) },
      { label: '个人日志', tone: 'default', value: String(profile?.logs.total ?? 0) },
      { label: '状态', tone: 'warning', value: sessionUser ? '在线' : '访客' },
    ],
  }))
})

userApi.route('/profile', profileApi)

export default userApi
