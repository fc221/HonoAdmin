import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { clearAdminSession } from '../../service/admin/session'
import { canAccessAdminPath } from '../../service/admin/system/role'
import { getDatabaseMigrationStatus } from '../../service/admin/system/update'
import { getUserCredentialByUsername, isAdminInstalled } from '../../service/admin/system/user'
import {
  clearRateLimit,
  consumeRateLimit,
  createRateLimitKey,
} from '../../service/security/rate-limit'
import { loginUser } from '../../service/user/login'
import { switchCurrentSessionRole } from '../../service/user/role-switch'
import { getClientIp } from '../../utils/request'
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
        403: emptyResponse('没有迁移权限'),
        428: emptyResponse('系统待迁移'),
        401: emptyResponse('用户名或密码错误'),
        429: emptyResponse('请求过于频繁'),
      },
    }),
    validate('json', loginInputSchema),
    async (c) => {
      const input = c.req.valid('json')
      const rateLimitKeys = await consumeLoginRateLimit(c, input.username)
      const pendingInstalledMigration = await hasPendingInstalledMigration(c)
      const ok = await loginUser(c, input, {
        writeOperateLog: !pendingInstalledMigration,
      })

      if (!ok) {
        return c.json({ message: '用户名或密码错误。' }, 401)
      }

      await clearLoginRateLimit(c, rateLimitKeys)
      const user = await getUserCredentialByUsername(c, input.username)
      if (pendingInstalledMigration) {
        if (
          !user
          || !await canAccessAdminPath(c, user, '/admin/system/update', 'POST', 'migrate')
        ) {
          clearAdminSession(c)
          return c.json({ message: '系统需要有迁移权限的管理员执行数据库迁移。' }, 403)
        }

        return c.json({ message: '系统待迁移,请在更新管理中执行数据库迁移。' }, 428)
      }

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

interface LoginRateLimitKeys {
  accountKey: string
  ipKey: string
}

async function consumeLoginRateLimit(
  c: Context<AppEnv>,
  username: string,
): Promise<LoginRateLimitKeys> {
  const ipKey = await createRateLimitKey('auth-login-ip', getClientIp(c))
  const accountKey = await createRateLimitKey('auth-login-account', normalizeLoginName(username))
  const windowSeconds = c.config.security.loginRateLimitWindowSeconds

  await consumeRateLimit(c, {
    key: ipKey,
    limit: c.config.security.loginRateLimitIpMax,
    windowSeconds,
  })
  await consumeRateLimit(c, {
    key: accountKey,
    limit: c.config.security.loginRateLimitAccountMax,
    windowSeconds,
  })

  return { accountKey, ipKey }
}

async function clearLoginRateLimit(
  c: Context<AppEnv>,
  keys: LoginRateLimitKeys,
): Promise<void> {
  await Promise.all([
    clearRateLimit(c, keys.ipKey),
    clearRateLimit(c, keys.accountKey),
  ])
}

function normalizeLoginName(username: string): string {
  return username.trim().toLowerCase() || 'unknown'
}

async function hasPendingInstalledMigration(c: Context<AppEnv>): Promise<boolean> {
  if (!c.config.bootstrap.isConfigured) {
    return false
  }

  const migration = await getDatabaseMigrationStatus(c).catch(() => null)
  if (!migration || migration.isComplete || migration.isFreshDatabase) {
    return false
  }

  return isAdminInstalled(c).catch(() => false)
}
