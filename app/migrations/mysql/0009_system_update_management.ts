import type { Migration } from '../types'

export const migration0009SystemUpdateManagement: Migration = {
  id: '0009_system_update_management',
  name: 'add system update management',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS config_update_next (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_type VARCHAR(30) NOT NULL CHECK (config_type IN ('site', 'system', 'file')),
        config_key VARCHAR(255) NOT NULL,
        config_value TEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE (config_type, config_key)
      )
    
    `,
    `
      INSERT IGNORE INTO config_update_next (
        id,
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      SELECT
        id,
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      FROM sys_config
      WHERE config_type IN ('site', 'system', 'file')
    
    `,
    `DROP TABLE sys_config
    `,
    `ALTER TABLE config_update_next RENAME TO sys_config
    `,
    `
      UPDATE sys_config
      SET config_type = 'file'
      WHERE config_type = 'system'
        AND config_key LIKE 'file_%'
    
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_file_upload_type_next (
        id INT AUTO_INCREMENT PRIMARY KEY,
        upload_type VARCHAR(30) NOT NULL CHECK (
          upload_type IN ('avatar', 'notification', 'page')
        ),
        storage_mode VARCHAR(30) NOT NULL CHECK (storage_mode IN ('local', 's3')),
        storage_key VARCHAR(500) NOT NULL UNIQUE,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        user_id INT,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      )
    
    `,
    `
      INSERT IGNORE INTO sys_file_upload_type_next (
        id,
        upload_type,
        storage_mode,
        storage_key,
        original_name,
        mime_type,
        file_size,
        user_id,
        created_at,
        updated_at
      )
      SELECT
        id,
        CASE upload_type
          WHEN 'notification_attachment' THEN 'notification'
          WHEN 'page_attachment' THEN 'page'
          ELSE upload_type
        END AS upload_type,
        storage_mode,
        storage_key,
        original_name,
        mime_type,
        file_size,
        user_id,
        created_at,
        updated_at
      FROM sys_file
      WHERE upload_type IN (
        'avatar',
        'notification',
        'page',
        'notification_attachment',
        'page_attachment'
      )
    
    `,
    `DROP TABLE sys_file
    `,
    `ALTER TABLE sys_file_upload_type_next RENAME TO sys_file
    `,
    `
      CREATE INDEX idx_sys_file_upload_type_created_at
      ON sys_file (upload_type, created_at, id)
    
    `,
    `
      CREATE INDEX idx_sys_file_user_id_created_at
      ON sys_file (user_id, created_at, id)
    
    `,
    {
      sql: `
      INSERT IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('system', ?, ?, ?, ?)
    
      `,
      params: [
        'update_check_url',
        '',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('system', ?, ?, ?, ?)
    
      `,
      params: [
        'update_latest_version',
        '',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('system', ?, ?, ?, ?)
    
      `,
      params: [
        'update_release_url',
        '',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('system', ?, ?, ?, ?)
    
      `,
      params: [
        'update_release_notes',
        '',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('system', ?, ?, ?, ?)
    
      `,
      params: [
        'update_checked_at',
        '',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      INSERT IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('system', ?, ?, ?, ?)
    
      `,
      params: [
        'update_ignored_version',
        '',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    `
      INSERT IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES (1, 'admin.system.update', '2026-01-01 00:00:00.000', '2026-01-01 00:00:00.000')
    
    `,
    {
      sql: `
      INSERT IGNORE INTO sys_permission (
        code,
        name,
        group_name,
        method_pattern,
        path_pattern,
        action_key,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, '更新管理', ?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'admin.system.update.view',
        '查看更新管理',
        'GET',
        '/admin/system/update',
        '*',
        820,
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
        action_key,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, '更新管理', ?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'admin.system.update.status',
        '查看更新状态',
        'GET',
        '/admin/system/update/status',
        '*',
        821,
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
        action_key,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, '更新管理', ?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'admin.system.update.check',
        '检测更新',
        'POST',
        '/admin/system/update',
        'check',
        822,
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
        action_key,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, '更新管理', ?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'admin.system.update.handle',
        '处理更新',
        'POST',
        '/admin/system/update',
        'handle',
        823,
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
        'admin.system.update.view',
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
        'admin.system.update.status',
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
        'admin.system.update.check',
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
        'admin.system.update.handle',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    }
  ],
}
