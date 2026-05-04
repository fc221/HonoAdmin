import type { TestServiceContext } from './helpers/service-context'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  canAccessAdminPath,
  createRole,
  createUser,
  getDatabaseMigrationStatus,
  getUpdateStatus,
  listPermissions,
  runDatabaseMigrations,
  UserStatus,
} from '../app/service'
import { createTestServiceContext } from './helpers/service-context'

let testContext: TestServiceContext

beforeEach(async () => {
  testContext = await createTestServiceContext()
})

afterEach(async () => {
  await testContext.cleanup()
})

describe('update service', () => {
  test('reports and runs pending migrations for a fresh database', async () => {
    await testContext.cleanup()
    testContext = await createTestServiceContext({ runMigrations: false })
    const { ctx } = testContext

    const freshStatus = await getDatabaseMigrationStatus(ctx)
    expect(freshStatus.isFreshDatabase).toBe(true)
    expect(freshStatus.isComplete).toBe(false)
    expect(freshStatus.pendingCount).toBeGreaterThan(0)
    expect(freshStatus.latestAppliedMigrationId).toBeNull()

    const migrated = await runDatabaseMigrations(ctx)
    expect(migrated.isComplete).toBe(true)
    expect(migrated.pendingCount).toBe(0)
    expect(migrated.latestAppliedMigrationId).toBe(
      migrated.latestCodeMigrationId,
    )
  })

  test('update status does not read system config before migrations complete', async () => {
    await testContext.cleanup()
    testContext = await createTestServiceContext({ runMigrations: false })

    const status = await getUpdateStatus(testContext.ctx)
    expect(status.currentVersion).toBe('0.0.0-test')
    expect(status.migration.isComplete).toBe(false)
  })

  test('update status only reports migration state', async () => {
    const { ctx } = testContext

    const status = await getUpdateStatus(ctx)
    expect(status.currentVersion).toBe('0.0.0-test')
    expect(status.migration.isComplete).toBe(true)
    expect(Object.hasOwn(status, 'latestVersion')).toBe(false)
  })

  test('update management permissions are registered', async () => {
    const { ctx } = testContext
    const role = await createRole(ctx, {
      code: 'update-manager',
      description: 'Update manager',
      menuNames: ['admin.system.update'],
      name: '更新管理员',
      permissionCodes: [
        'admin.system.update.view',
        'admin.system.update.status',
      ],
    })
    const user = await createUser(ctx, {
      isRoot: false,
      password: 'secret123',
      roleId: role.id,
      status: UserStatus.NORMAL,
      username: 'update.manager',
    })
    const credential = {
      id: user.id,
      isRoot: false,
      password: '',
      roleId: role.id,
      username: user.username,
    }

    expect(
      await canAccessAdminPath(ctx, credential, '/admin/system/update', 'GET'),
    ).toBe(true)
    expect(
      await canAccessAdminPath(
        ctx,
        credential,
        '/admin/system/update/status',
        'GET',
      ),
    ).toBe(true)
    expect(
      await canAccessAdminPath(
        ctx,
        credential,
        '/admin/system/update',
        'POST',
        'migrate',
      ),
    ).toBe(false)
    expect(
      (await listPermissions(ctx)).some((permission) =>
        permission.code === 'admin.system.update.migrate'
      ),
    ).toBe(true)
  })
})
