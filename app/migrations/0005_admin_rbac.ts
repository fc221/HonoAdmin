import type { Migration } from './types'

const seedTime = '2026-01-01T00:00:00.000Z'

export const migration0005AdminRbac: Migration = {
  id: '0005_admin_rbac',
  name: 'add admin rbac role and policy tables',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_role (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_role_menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER NOT NULL,
        menu_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (role_id, menu_name)
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_role_policy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER NOT NULL,
        path_pattern TEXT NOT NULL,
        method_pattern TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (role_id, path_pattern, method_pattern)
      )
    `,
    'ALTER TABLE "user" ADD COLUMN role_id INTEGER',
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
        1,
        'admin',
        '管理员',
        '内置管理员角色，默认拥有全部后台菜单和操作权限。',
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
      VALUES
        (1, 'admin.dashboard', '${seedTime}', '${seedTime}'),
        (1, 'admin.web', '${seedTime}', '${seedTime}'),
        (1, 'admin.web.page', '${seedTime}', '${seedTime}'),
        (1, 'admin.web.notification', '${seedTime}', '${seedTime}'),
        (1, 'admin.web.feedback', '${seedTime}', '${seedTime}'),
        (1, 'admin.system', '${seedTime}', '${seedTime}'),
        (1, 'admin.system.config', '${seedTime}', '${seedTime}'),
        (1, 'admin.system.role', '${seedTime}', '${seedTime}'),
        (1, 'admin.system.user', '${seedTime}', '${seedTime}'),
        (1, 'admin.system.operate-log', '${seedTime}', '${seedTime}')
    `,
    `
      INSERT OR IGNORE INTO sys_role_policy (
        role_id,
        path_pattern,
        method_pattern,
        created_at,
        updated_at
      )
      VALUES
        (1, '/admin', '*', '${seedTime}', '${seedTime}'),
        (1, '/admin/*', '*', '${seedTime}', '${seedTime}')
    `,
    `
      UPDATE "user"
      SET role_id = 1
      WHERE is_root = 1 AND role_id IS NULL
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_user_role_id
      ON "user" (role_id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_role_menu_role_id
      ON sys_role_menu (role_id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_role_policy_role_id
      ON sys_role_policy (role_id)
    `,
  ],
}
