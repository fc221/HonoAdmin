import type { AppEnv } from '@hono-admin/runtime'
import { Hono } from 'hono'
import {
  clearAdminSession,
} from '../../service/admin/session'
import { getUserCredentialByUsername } from '../../service/admin/system/user'
import { loginUser } from '../../service/user/login'
import { switchCurrentSessionRole } from '../../service/user/role-switch'
import { loginInputSchema } from '../schema'
import { getSessionProfile, getSessionProfileByUserId } from '../shared/layout'

const authApi = new Hono<AppEnv>()

authApi.post('/login', async (c) => {
  const input = loginInputSchema.parse(await c.req.json())
  const ok = await loginUser(c, input)

  if (!ok) {
    return c.json({ message: '用户名或密码错误。' }, 401)
  }

  const user = await getUserCredentialByUsername(c, input.username)
  const profile = user ? await getSessionProfileByUserId(c, user.id) : null
  return c.json(profile)
})

authApi.post('/logout', (c) => {
  clearAdminSession(c)
  return c.json({ ok: true })
})

authApi.get('/session', async (c) => {
  return c.json(await getSessionProfile(c))
})

authApi.post('/role', async (c) => {
  const result = await switchCurrentSessionRole(c, await c.req.json())
  return c.json({
    data: {
      roleId: result.roleId,
      target: result.target,
    },
    message: result.message,
    ok: true,
  })
})

export default authApi
