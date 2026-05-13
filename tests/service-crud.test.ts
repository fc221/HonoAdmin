import type { TestServiceContext } from './helpers/service-context'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  getSiteConfig,
  listConfigs,
  upsertConfig,
} from '../app/service/admin/system/config'
import {
  createOperateLog,
  listOperateLogs,
} from '../app/service/admin/system/operate-log'
import {
  canAccessAdminPath,
  createRole,
  deleteRole,
  invalidateRoleAccessCache,
  listAuthorizedAdminMenus,
  listRoles,
  updateRole,
} from '../app/service/admin/system/role'
import {
  createUser,
  deleteUser,
  getUserCredentialByUsername,
  listUsers,
  needsPasswordRehash,
  updateUser,
  verifyUserPassword,
} from '../app/service/admin/system/user'
import { UserGender, UserStatus } from '../app/service/admin/system/user/enum'
import {
  createWebNotification,
  deleteWebNotification,
  getWebNotificationByAlias,
  listWebNotifications,
  updateWebNotification,
} from '../app/service/admin/web/notification'
import {
  createWebPage,
  deleteWebPage,
  getWebPageByAlias,
  listWebPages,
  updateWebPage,
} from '../app/service/admin/web/page'
import { createTestServiceContext } from './helpers/service-context'

let testContext: TestServiceContext

beforeEach(async () => {
  testContext = await createTestServiceContext()
})

afterEach(async () => {
  await testContext.cleanup()
})

describe('service CRUD', () => {
  test('site config reads through cache and invalidates on write', async () => {
    const { ctx } = testContext

    const initial = await getSiteConfig(ctx)
    expect(initial.title).toBe('HonoAdmin')

    await upsertConfig(ctx, {
      configKey: 'site_name',
      configType: 'site',
      configValue: 'Hono Admin Pro',
    })
    await upsertConfig(ctx, {
      configKey: 'site_description',
      configType: 'site',
      configValue: 'Admin console for Hono apps.',
    })

    const updated = await getSiteConfig(ctx)
    expect(updated).toMatchObject({
      description: 'Admin console for Hono apps.',
      title: 'Hono Admin Pro',
    })

    const configs = await listConfigs(ctx)
    expect(configs.slice(0, 4).map((config) => config.configKey)).toEqual([
      'site_name',
      'site_subtitle',
      'site_keywords',
      'site_description',
    ])
  })

  test('user create, list, update, delete', async () => {
    const { ctx } = testContext
    const roles = await listRoles(ctx)
    const adminRoleId = roles.find((role) => role.code === 'admin')?.id
    const userRoleId = roles.find((role) => role.code === 'user')?.id

    expect(adminRoleId).toBeDefined()
    expect(userRoleId).toBeDefined()
    if (!adminRoleId || !userRoleId) {
      throw new Error('Expected default admin and user roles to exist.')
    }

    const created = await createUser(ctx, {
      isRoot: false,
      password: 'secret123',
      roleIds: [userRoleId, adminRoleId],
      status: UserStatus.NORMAL,
      username: 'editor',
    })

    expect(created.id).toBeGreaterThan(0)
    expect(created.username).toBe('editor')
    expect(created.roleIds).toEqual([userRoleId, adminRoleId])
    const credential = await getUserCredentialByUsername(ctx, 'editor')
    expect(credential?.password.startsWith('pbkdf2-sha256:100000:')).toBe(true)
    expect(needsPasswordRehash(credential?.password ?? '')).toBe(false)
    expect(await verifyUserPassword('secret123', credential?.password ?? '')).toBe(true)

    const list = await listUsers(ctx, { keyword: 'edit' })
    expect(list.total).toBe(1)
    expect(list.items[0]?.username).toBe('editor')
    expect(list.items[0]?.roleIds).toEqual([userRoleId, adminRoleId])

    const updated = await updateUser(ctx, created.id, {
      bio: 'Writes and reviews content.',
      gender: UserGender.OTHER,
      mail: 'editor@example.com',
      nickname: 'Editor',
      phone: '13800000000',
      roleIds: [adminRoleId],
    })
    expect(updated.bio).toBe('Writes and reviews content.')
    expect(updated.gender).toBe(UserGender.OTHER)
    expect(updated.mail).toBe('editor@example.com')
    expect(updated.nickname).toBe('Editor')
    expect(updated.phone).toBe('13800000000')
    expect(updated.roleId).toBe(adminRoleId)
    expect(updated.roleIds).toEqual([adminRoleId])

    const byMail = await listUsers(ctx, { keyword: 'editor@example.com' })
    expect(byMail.total).toBe(1)
    const byPhone = await listUsers(ctx, { keyword: '13800000000' })
    expect(byPhone.total).toBe(1)
    const byBio = await listUsers(ctx, { keyword: 'reviews' })
    expect(byBio.total).toBe(0)

    await deleteUser(ctx, created.id)
    const afterDelete = await listUsers(ctx, { keyword: 'editor' })
    expect(afterDelete.total).toBe(0)
  })

  test('operate log pagination can be scoped to one user', async () => {
    const { ctx } = testContext
    const firstUser = await createUser(ctx, {
      isRoot: false,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'log.user.one',
    })
    const secondUser = await createUser(ctx, {
      isRoot: false,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'log.user.two',
    })

    await createOperateLog(ctx, {
      logMsg: 'first user action',
      logType: 'operation',
      userId: firstUser.id,
    })
    await createOperateLog(ctx, {
      logMsg: 'second user action',
      logType: 'operation',
      userId: secondUser.id,
    })

    const logs = await listOperateLogs(ctx, { userId: firstUser.id })
    expect(logs.total).toBe(1)
    expect(logs.items[0]?.userId).toBe(firstUser.id)
    expect(logs.items[0]?.logMsg).toBe('first user action')
  })

  test('root user cannot be created twice or promoted from user management', async () => {
    const { ctx } = testContext
    await createUser(ctx, {
      isRoot: true,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'root.one',
    })

    await expect(createUser(ctx, {
      isRoot: true,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'root.two',
    })).rejects.toThrow('不支持通过后台入口新增 root 管理员。')

    const normalUser = await createUser(ctx, {
      isRoot: false,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'normal.user',
    })

    await expect(updateUser(ctx, normalUser.id, {
      isRoot: true,
    })).rejects.toThrow('不支持通过后台入口新增 root 管理员。')
  })

  test('role create, policy enforcement, update, delete', async () => {
    const { ctx } = testContext
    const created = await createRole(ctx, {
      code: 'content-editor',
      description: 'Content editor',
      menuNames: ['admin.web.page'],
      name: '内容编辑',
      permissionCodes: [
        'admin.web.page.view',
        'admin.web.page.add.view',
      ],
    })

    expect(created.id).toBeGreaterThan(0)
    expect(created.policies).toContainEqual({
      actionKey: '*',
      methodPattern: 'GET',
      pathPattern: '/admin/web/page',
    })

    const user = await createUser(ctx, {
      isRoot: false,
      password: 'secret123',
      roleId: created.id,
      status: UserStatus.NORMAL,
      username: 'content.editor',
    })
    const credential = {
      id: user.id,
      isRoot: false,
      password: '',
      roleId: created.id,
      username: user.username,
    }

    const menus = await listAuthorizedAdminMenus(ctx, credential)
    expect(menus[0]?.children?.[0]?.name).toBe('admin.web.page')
    expect(
      await canAccessAdminPath(ctx, credential, '/admin/web/page/add', 'GET'),
    ).toBe(true)
    expect(
      await canAccessAdminPath(ctx, credential, '/admin/web/page/add', 'HEAD'),
    ).toBe(true)
    expect(
      await canAccessAdminPath(ctx, credential, '/admin/system/user', 'GET'),
    ).toBe(false)

    await ctx.db.execute(
      `
        DELETE FROM sys_role_permission
        WHERE role_id = ? AND permission_code = ?
      `,
      [created.id, 'admin.web.page.add.view'],
    )
    expect(
      await canAccessAdminPath(ctx, credential, '/admin/web/page/add', 'GET'),
    ).toBe(true)
    await invalidateRoleAccessCache(ctx, created.id)
    expect(
      await canAccessAdminPath(ctx, credential, '/admin/web/page/add', 'GET'),
    ).toBe(false)

    await updateRole(ctx, created.id, {
      code: 'content-editor',
      description: null,
      menuNames: ['admin.system.user'],
      name: '用户创建员',
      permissionCodes: ['admin.system.user.create'],
    })
    expect(
      await canAccessAdminPath(
        ctx,
        credential,
        '/admin/system/user',
        'POST',
        'create',
      ),
    ).toBe(true)
    expect(
      await canAccessAdminPath(
        ctx,
        credential,
        '/admin/system/user',
        'POST',
        'delete',
      ),
    ).toBe(false)

    const updated = await updateRole(ctx, created.id, {
      code: 'content-editor',
      description: null,
      menuNames: ['admin.system.operate-log'],
      name: '内容审核',
      permissionCodes: ['admin.system.operate-log.view'],
    })
    expect(updated.name).toBe('内容审核')
    expect(
      await canAccessAdminPath(ctx, credential, '/admin/system/operate-log', 'GET'),
    ).toBe(true)
    expect(
      await canAccessAdminPath(ctx, credential, '/admin/web/page/add', 'GET'),
    ).toBe(false)

    await deleteUser(ctx, user.id)
    await deleteRole(ctx, created.id)
    const roles = await listRoles(ctx)
    expect(roles.some((role) => role.id === created.id)).toBe(false)
  })

  test('web page create, list, update, delete', async () => {
    const { ctx } = testContext
    const created = await createWebPage(ctx, {
      alias: 'about',
      category: 'site',
      content: '<p>Hello</p>',
      summary: 'About summary',
      title: 'About',
    })

    expect(created.alias).toBe('about')
    expect(await getWebPageByAlias(ctx, 'about')).toMatchObject({
      title: 'About',
    })

    const list = await listWebPages(ctx, { keyword: 'about' })
    expect(list.total).toBe(1)

    const updated = await updateWebPage(ctx, created.id, {
      summary: 'Updated summary',
      title: 'About us',
    })
    expect(updated.summary).toBe('Updated summary')
    expect(updated.title).toBe('About us')

    await deleteWebPage(ctx, created.id)
    const afterDelete = await listWebPages(ctx, { keyword: 'about' })
    expect(afterDelete.total).toBe(0)
  })

  test('notification create, list, update, delete', async () => {
    const { ctx } = testContext
    const created = await createWebNotification(ctx, {
      alias: 'release',
      content: '<p>Release notes</p>',
      isImportant: false,
      isTop: true,
      title: 'Release',
    })

    expect(created.isTop).toBe(1)
    expect(await getWebNotificationByAlias(ctx, 'release')).toMatchObject({
      title: 'Release',
    })

    const list = await listWebNotifications(ctx, { keyword: 'release' })
    expect(list.total).toBe(1)

    const updated = await updateWebNotification(ctx, created.id, {
      isImportant: true,
      title: 'Release updated',
    })
    expect(updated.isImportant).toBe(1)
    expect(updated.title).toBe('Release updated')

    await deleteWebNotification(ctx, created.id)
    const afterDelete = await listWebNotifications(ctx, { keyword: 'release' })
    expect(afterDelete.total).toBe(0)
  })
})
