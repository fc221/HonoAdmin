import type { TestServiceContext } from './helpers/service-context'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { handleUserAction } from '../app/routes/admin/system/user/-actions'
import { listRoles } from '../app/service/admin/system/role'
import {
  createUser,
  getUserById,
} from '../app/service/admin/system/user'
import { UserStatus } from '../app/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

let testContext: TestServiceContext

beforeEach(async () => {
  testContext = await createTestServiceContext()
})

afterEach(async () => {
  await testContext.cleanup()
})

describe('user admin actions', () => {
  test('preserves multiple role selections when updating a user', async () => {
    const { ctx } = testContext
    const roles = await listRoles(ctx)
    const adminRoleId = roles.find((role) => role.code === 'admin')?.id
    const userRoleId = roles.find((role) => role.code === 'user')?.id

    expect(adminRoleId).toBeDefined()
    expect(userRoleId).toBeDefined()
    if (!adminRoleId || !userRoleId) {
      throw new Error('Expected default admin and user roles to exist.')
    }

    const rootUser = await createUser(ctx, {
      isRoot: true,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'root.admin',
    })

    const form = new URLSearchParams({
      id: String(rootUser.id),
      intent: 'update',
      status: UserStatus.NORMAL,
      username: rootUser.username,
    })
    form.append('roleIds', String(adminRoleId))
    form.append('roleIds', String(userRoleId))

    const response = await createUserActionTestApp(ctx).request(
      '/admin/system/user',
      {
        body: form,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      },
    )

    expect(response.status).toBe(303)
    const updated = await getUserById(ctx, rootUser.id)
    expect(updated.roleId).toBe(adminRoleId)
    expect(updated.roleIds).toEqual([adminRoleId, userRoleId])
  })
})

function createUserActionTestApp(ctx: TestServiceContext['ctx']) {
  const app = new Hono()

  app.post('/admin/system/user', (c) => {
    Object.assign(c, ctx)
    return handleUserAction(c)
  })

  return app
}
