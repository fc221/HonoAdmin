import type { Migration } from '../types'

export const migration0006AdminPermissionCatalog: Migration = {
  id: '0006_admin_permission_catalog',
  name: 'add admin permission catalog and default user role',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_permission (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        group_name VARCHAR(255) NOT NULL,
        method_pattern VARCHAR(20) NOT NULL,
        path_pattern VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      )
    
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_role_permission (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        permission_code VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE (role_id, permission_code)
      )
    
    `,
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.dashboard.view',
        '查看仪表盘',
        '仪表盘',
        'GET',
        '/admin/dashboard',
        10,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.page.view',
        '查看页面列表',
        '页面管理',
        'GET',
        '/admin/web/page',
        100,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.page.add.view',
        '打开新增页面',
        '页面管理',
        'GET',
        '/admin/web/page/add',
        101,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.page.create',
        '新增页面',
        '页面管理',
        'POST',
        '/admin/web/page/add',
        102,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.page.edit.view',
        '打开编辑页面',
        '页面管理',
        'GET',
        '/admin/web/page/edit',
        103,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.page.update',
        '更新页面',
        '页面管理',
        'POST',
        '/admin/web/page/edit',
        104,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.page.delete',
        '删除页面',
        '页面管理',
        'POST',
        '/admin/web/page',
        105,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.notification.view',
        '查看公告列表',
        '公告管理',
        'GET',
        '/admin/web/notification',
        200,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.notification.add.view',
        '打开新增公告',
        '公告管理',
        'GET',
        '/admin/web/notification/add',
        201,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.notification.create',
        '新增公告',
        '公告管理',
        'POST',
        '/admin/web/notification/add',
        202,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.notification.edit.view',
        '打开编辑公告',
        '公告管理',
        'GET',
        '/admin/web/notification/edit',
        203,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.notification.update',
        '更新公告',
        '公告管理',
        'POST',
        '/admin/web/notification/edit',
        204,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.notification.delete',
        '删除公告',
        '公告管理',
        'POST',
        '/admin/web/notification',
        205,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.feedback.view',
        '查看反馈列表',
        '用户反馈',
        'GET',
        '/admin/web/feedback',
        300,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.feedback.update',
        '处理反馈',
        '用户反馈',
        'POST',
        '/admin/web/feedback',
        301,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.web.feedback.delete',
        '删除反馈',
        '用户反馈',
        'POST',
        '/admin/web/feedback',
        302,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.config.view',
        '查看配置',
        '配置管理',
        'GET',
        '/admin/system/config',
        400,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.config.update',
        '保存配置',
        '配置管理',
        'POST',
        '/admin/system/config',
        401,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.role.view',
        '查看角色列表',
        '角色管理',
        'GET',
        '/admin/system/role',
        500,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.role.add.view',
        '打开新增角色',
        '角色管理',
        'GET',
        '/admin/system/role/add',
        501,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.role.create',
        '新增角色',
        '角色管理',
        'POST',
        '/admin/system/role/add',
        502,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.role.edit.view',
        '打开编辑角色',
        '角色管理',
        'GET',
        '/admin/system/role/edit',
        503,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.role.update',
        '更新角色',
        '角色管理',
        'POST',
        '/admin/system/role/edit',
        504,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.role.delete',
        '删除角色',
        '角色管理',
        'POST',
        '/admin/system/role',
        505,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.user.view',
        '查看用户列表',
        '用户管理',
        'GET',
        '/admin/system/user',
        600,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.user.create',
        '新增用户',
        '用户管理',
        'POST',
        '/admin/system/user',
        601,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.user.update',
        '更新用户',
        '用户管理',
        'POST',
        '/admin/system/user',
        602,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.user.delete',
        '删除用户',
        '用户管理',
        'POST',
        '/admin/system/user',
        603,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.operate-log.view',
        '查看操作日志',
        '操作日志',
        'GET',
        '/admin/system/operate-log',
        700,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
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
        'admin.system.operate-log.delete',
        '删除操作日志',
        '操作日志',
        'POST',
        '/admin/system/operate-log',
        701,
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    `
      INSERT IGNORE INTO sys_role (
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
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      )
    
    `,
    `
      INSERT IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES (2, 'admin.dashboard', '2026-01-01 00:00:00.000', '2026-01-01 00:00:00.000')
    
    `,
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.dashboard.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.page.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.page.add.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.page.create',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.page.edit.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.page.update',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.page.delete',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.notification.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.notification.add.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.notification.create',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.notification.edit.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.notification.update',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.notification.delete',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.feedback.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.feedback.update',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.web.feedback.delete',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.config.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.config.update',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.role.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.role.add.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.role.create',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.role.edit.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.role.update',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.role.delete',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.user.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.user.create',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.user.update',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.user.delete',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.operate-log.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        1,
        'admin.system.operate-log.delete',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_role_permission (
        role_id,
        permission_code,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    
      `,
      params: [
        2,
        'admin.dashboard.view',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    `
      UPDATE sys_user
      SET role_id = 2
      WHERE is_root = 0 AND role_id IS NULL
    
    `,
    `
      CREATE INDEX idx_permission_sort
      ON sys_permission (sort_order, id)
    
    `,
    `
      CREATE INDEX idx_role_permission_role_id
      ON sys_role_permission (role_id)
    
    `,
    `
      CREATE INDEX idx_role_permission_code
      ON sys_role_permission (permission_code)
    
    `
  ],
}
