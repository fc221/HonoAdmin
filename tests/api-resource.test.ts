import type { AppEnv } from '@hono-admin/runtime'
import type { Context, Next } from 'hono'
import { describe, expect, test } from 'bun:test'
import app, { setApiRuntimeContextMiddleware } from '../apps/server/src/app'
import { listRoles } from '../apps/server/src/service/admin/system/role'
import {
  createUser,
  getUserCredentialByUsername,
  verifyUserPassword,
} from '../apps/server/src/service/admin/system/user'
import { UserStatus } from '../apps/server/src/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

describe('API resource routes', () => {
  test('admin user update accepts blank optional fields without returning 500', async () => {
    const testContext = await createTestServiceContext()
    const { ctx } = testContext

    try {
      setApiRuntimeContextMiddleware(async (c: Context<AppEnv>, next: Next) => {
        c.runtime = ctx.runtime
        c.db = ctx.db
        c.cache = ctx.cache
        c.config = ctx.config
        c.now = ctx.now
        await next()
      })

      const roles = await listRoles(ctx)
      const adminRoleId = roles.find((role) => role.code === 'admin')?.id
      const userRoleId = roles.find((role) => role.code === 'user')?.id

      expect(adminRoleId).toBeDefined()
      expect(userRoleId).toBeDefined()
      if (!adminRoleId || !userRoleId) {
        throw new Error('Expected default admin and user roles to exist.')
      }

      const admin = await createUser(ctx, {
        isRoot: true,
        password: 'secret123',
        roleIds: [userRoleId],
        status: UserStatus.NORMAL,
        username: 'admin',
      })

      const login = await app.request('/api/auth/login', {
        body: JSON.stringify({ password: 'secret123', remember: true, username: 'admin' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      expect(login.status).toBe(200)
      const cookie = getCookieHeader(login)

      const update = await app.request(`/api/admin/user/${admin.id}`, {
        body: JSON.stringify({
          bio: '',
          gender: '',
          mail: '',
          nickname: '',
          password: '',
          phone: '',
          roleIds: [adminRoleId, userRoleId],
          status: UserStatus.NORMAL,
          username: 'admin',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
        method: 'PUT',
      })
      const updatePayload = await update.json()

      expect(update.status).toBe(200)
      expect(updatePayload).toMatchObject({
        data: {
          bio: null,
          gender: null,
          mail: null,
          nickname: null,
          phone: null,
          username: 'admin',
        },
        ok: true,
      })

      const credential = await getUserCredentialByUsername(ctx, 'admin')
      expect(await verifyUserPassword('secret123', credential?.password ?? '')).toBe(true)

      const switchRole = await app.request('/api/auth/role', {
        body: JSON.stringify({ roleId: userRoleId }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
        method: 'POST',
      })
      const switchPayload = await switchRole.json()

      expect(switchRole.status).toBe(200)
      expect(switchPayload).toMatchObject({
        data: {
          roleId: userRoleId,
          target: '/user',
        },
        ok: true,
      })
    } finally {
      await testContext.cleanup()
    }
  })
})

function getCookieHeader(response: Response): string {
  const setCookie = response.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()
  return setCookie?.split(';')[0] ?? ''
}
