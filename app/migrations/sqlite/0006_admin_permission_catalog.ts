import type { Migration, MigrationStatement } from '../types'

const seedTime = '2026-01-01T00:00:00.000Z'

interface PermissionSeed {
  code: string
  groupName: string
  methodPattern: string
  name: string
  pathPattern: string
  sortOrder: number
}

const permissionSeeds: PermissionSeed[] = [
  permission('admin.dashboard.view', '仪表盘', '查看仪表盘', 'GET', '/admin/dashboard', 10),

  permission('admin.web.page.view', '页面管理', '查看页面列表', 'GET', '/admin/web/page', 100),
  permission('admin.web.page.add.view', '页面管理', '打开新增页面', 'GET', '/admin/web/page/add', 101),
  permission('admin.web.page.create', '页面管理', '新增页面', 'POST', '/admin/web/page/add', 102),
  permission('admin.web.page.edit.view', '页面管理', '打开编辑页面', 'GET', '/admin/web/page/edit', 103),
  permission('admin.web.page.update', '页面管理', '更新页面', 'POST', '/admin/web/page/edit', 104),
  permission('admin.web.page.delete', '页面管理', '删除页面', 'POST', '/admin/web/page', 105),

  permission('admin.web.notification.view', '公告管理', '查看公告列表', 'GET', '/admin/web/notification', 200),
  permission('admin.web.notification.add.view', '公告管理', '打开新增公告', 'GET', '/admin/web/notification/add', 201),
  permission('admin.web.notification.create', '公告管理', '新增公告', 'POST', '/admin/web/notification/add', 202),
  permission('admin.web.notification.edit.view', '公告管理', '打开编辑公告', 'GET', '/admin/web/notification/edit', 203),
  permission('admin.web.notification.update', '公告管理', '更新公告', 'POST', '/admin/web/notification/edit', 204),
  permission('admin.web.notification.delete', '公告管理', '删除公告', 'POST', '/admin/web/notification', 205),

  permission('admin.web.feedback.view', '用户反馈', '查看反馈列表', 'GET', '/admin/web/feedback', 300),
  permission('admin.web.feedback.update', '用户反馈', '处理反馈', 'POST', '/admin/web/feedback', 301),
  permission('admin.web.feedback.delete', '用户反馈', '删除反馈', 'POST', '/admin/web/feedback', 302),

  permission('admin.system.config.view', '配置管理', '查看配置', 'GET', '/admin/system/config', 400),
  permission('admin.system.config.update', '配置管理', '保存配置', 'POST', '/admin/system/config', 401),

  permission('admin.system.role.view', '角色管理', '查看角色列表', 'GET', '/admin/system/role', 500),
  permission('admin.system.role.add.view', '角色管理', '打开新增角色', 'GET', '/admin/system/role/add', 501),
  permission('admin.system.role.create', '角色管理', '新增角色', 'POST', '/admin/system/role/add', 502),
  permission('admin.system.role.edit.view', '角色管理', '打开编辑角色', 'GET', '/admin/system/role/edit', 503),
  permission('admin.system.role.update', '角色管理', '更新角色', 'POST', '/admin/system/role/edit', 504),
  permission('admin.system.role.delete', '角色管理', '删除角色', 'POST', '/admin/system/role', 505),

  permission('admin.system.user.view', '用户管理', '查看用户列表', 'GET', '/admin/system/user', 600),
  permission('admin.system.user.create', '用户管理', '新增用户', 'POST', '/admin/system/user', 601),
  permission('admin.system.user.update', '用户管理', '更新用户', 'POST', '/admin/system/user', 602),
  permission('admin.system.user.delete', '用户管理', '删除用户', 'POST', '/admin/system/user', 603),

  permission('admin.system.operate-log.view', '操作日志', '查看操作日志', 'GET', '/admin/system/operate-log', 700),
  permission('admin.system.operate-log.delete', '操作日志', '删除操作日志', 'POST', '/admin/system/operate-log', 701),
]

export const migration0006AdminPermissionCatalog: Migration = {
  id: '0006_admin_permission_catalog',
  name: 'add admin permission catalog and default user role',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_permission (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        group_name TEXT NOT NULL,
        method_pattern TEXT NOT NULL,
        path_pattern TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_role_permission (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER NOT NULL,
        permission_code TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (role_id, permission_code)
      )
    `,
    ...permissionSeeds.map(createPermissionInsert),
    `
      INSERT OR IGNORE INTO sys_role (
        id,
        code,
        name,
        description,
        created_at,
        updated_at
      )
      VALUES (
        2,
        'user',
        '用户',
        '默认普通用户角色，仅保留基础后台入口。',
        '${seedTime}',
        '${seedTime}'
      )
    `,
    `
      INSERT OR IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES (2, 'admin.dashboard', '${seedTime}', '${seedTime}')
    `,
    ...permissionSeeds.map((item) =>
      createRolePermissionInsert(1, item.code)
    ),
    createRolePermissionInsert(2, 'admin.dashboard.view'),
    `
      UPDATE sys_user
      SET role_id = 2
      WHERE is_root = 0 AND role_id IS NULL
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_permission_sort
      ON sys_permission (sort_order, id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_role_permission_role_id
      ON sys_role_permission (role_id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_role_permission_code
      ON sys_role_permission (permission_code)
    `,
  ],
}

function permission(
  code: string,
  groupName: string,
  name: string,
  methodPattern: string,
  pathPattern: string,
  sortOrder: number,
): PermissionSeed {
  return { code, groupName, methodPattern, name, pathPattern, sortOrder }
}

function createPermissionInsert(item: PermissionSeed): MigrationStatement {
  return {
    sql: `
      INSERT OR IGNORE INTO sys_permission (
        code,
        name,
        group_name,
        method_pattern,
        path_pattern,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      item.code,
      item.name,
      item.groupName,
      item.methodPattern,
      item.pathPattern,
      item.sortOrder,
      seedTime,
      seedTime,
    ],
  }
}

function createRolePermissionInsert(
  roleId: number,
  permissionCode: string,
): MigrationStatement {
  return {
    sql: `
      INSERT OR IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    `,
    params: [roleId, permissionCode, seedTime, seedTime],
  }
}
