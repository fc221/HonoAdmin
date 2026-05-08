import type { Migration } from '../types'

export const migration0005AdminRbac: Migration = {
  id: '0005_admin_rbac',
  name: 'add admin rbac role and policy tables',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_role (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_role_menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        menu_name VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE (role_id, menu_name)
      )
    
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_role_policy (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        path_pattern VARCHAR(255) NOT NULL,
        method_pattern VARCHAR(20) NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE (role_id, path_pattern, method_pattern)
      )
    
    `,
    `ALTER TABLE sys_user ADD COLUMN role_id INT
    `,
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
        1,
        'admin',
        '管理员',
        '内置管理员角色，默认拥有全部后台菜单和操作权限。',
        1767225600000,
        1767225600000
      )
    
    `,
    `
      INSERT IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES
        (1, 'admin.dashboard', 1767225600000, 1767225600000),
        (1, 'admin.web', 1767225600000, 1767225600000),
        (1, 'admin.web.page', 1767225600000, 1767225600000),
        (1, 'admin.web.notification', 1767225600000, 1767225600000),
        (1, 'admin.web.feedback', 1767225600000, 1767225600000),
        (1, 'admin.system', 1767225600000, 1767225600000),
        (1, 'admin.system.config', 1767225600000, 1767225600000),
        (1, 'admin.system.role', 1767225600000, 1767225600000),
        (1, 'admin.system.user', 1767225600000, 1767225600000),
        (1, 'admin.system.operate-log', 1767225600000, 1767225600000)
    
    `,
    `
      INSERT IGNORE INTO sys_role_policy (
        role_id,
        path_pattern,
        method_pattern,
        created_at,
        updated_at
      )
      VALUES
        (1, '/admin', '*', 1767225600000, 1767225600000),
        (1, '/admin/*', '*', 1767225600000, 1767225600000)
    
    `,
    `
      UPDATE sys_user
      SET role_id = 1
      WHERE is_root = 1 AND role_id IS NULL
    
    `,
    `
      CREATE INDEX idx_user_role_id
      ON sys_user (role_id)
    
    `,
    `
      CREATE INDEX idx_role_menu_role_id
      ON sys_role_menu (role_id)
    
    `,
    `
      CREATE INDEX idx_role_policy_role_id
      ON sys_role_policy (role_id)
    
    `
  ],
}
