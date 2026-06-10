import type { AppEnv } from '@hono-admin/runtime'
import { Hono } from 'hono'
import {
  clearAdminSession,
} from '../../service/admin/session'
import { getUserCredentialByUsername } from '../../service/admin/system/user'
import { loginUser } from '../../service/user/login'
import { switchCurrentSessionRole } from '../../service/user/role-switch'
import { loginInputSchema, roleSwitchInputSchema, userProfileSchema } from '../schema'
import { getSessionProfile, getSessionProfileByUserId } from '../shared/layout'
import { describeRoute, emptyResponse, jsonResponse, validate } from '../shared/openapi'
import { resourceMutationSchema } from '../shared/resource-schema'

const authApi = new Hono<AppEnv>()
  .post(
    '/login',
    describeRoute({
      tags: ['auth'],
      summary: '账号密码登录',
      responses: {
        200: jsonResponse(userProfileSchema, '已登录用户'),
        401: emptyResponse('用户名或密码错误'),
      },
    }),
    validate('json', loginInputSchema),
    async (c) => {
      const input = c.req.valid('json')
      const ok = await loginUser(c, input)

      if (!ok) {
        return c.json({ message: '用户名或密码错误。' }, 401)
      }

      const user = await getUserCredentialByUsername(c, input.username)
      const profile = user ? await getSessionProfileByUserId(c, user.id) : null
      return c.json(profile)
    },
  )
  .post(
    '/logout',
    describeRoute({
      tags: ['auth'],
      summary: '退出登录',
      responses: { 200: jsonResponse(resourceMutationSchema, '已退出') },
    }),
    (c) => {
      clearAdminSession(c)
      return c.json({ ok: true })
    },
  )
  .get(
    '/session',
    describeRoute({
      tags: ['auth'],
      summary: '读取当前会话',
      responses: { 200: jsonResponse(userProfileSchema.nullable(), '当前会话') },
    }),
    async (c) => {
      return c.json(await getSessionProfile(c))
    },
  )
  .post(
    '/role',
    describeRoute({
      tags: ['auth'],
      summary: '切换当前会话角色',
      responses: { 200: jsonResponse(resourceMutationSchema, '角色已切换') },
    }),
    validate('json', roleSwitchInputSchema),
    async (c) => {
      const result = await switchCurrentSessionRole(c, c.req.valid('json'))
      return c.json({
        data: {
          roleId: result.roleId,
          target: result.target,
        },
        message: result.message,
        ok: true,
      })
    },
  )

export default authApi
