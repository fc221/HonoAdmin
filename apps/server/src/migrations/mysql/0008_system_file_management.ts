import type { Migration } from '../types'

export const migration0008SystemFileManagement: Migration = {
  id: '0008_system_file_management',
  name: 'add system file management',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS config_file_next (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_type VARCHAR(30) NOT NULL CHECK (config_type IN ('site', 'system', 'file')),
        config_key VARCHAR(255) NOT NULL,
        config_value TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE (config_type, config_key)
      )
    
    `,
    `
      INSERT IGNORE INTO config_file_next (
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
    
    `,
    `DROP TABLE sys_config
    `,
    `ALTER TABLE config_file_next RENAME TO sys_config
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_file (
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
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_storage_driver',
        'local',
        1767225600000,
        1767225600000
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_local_root',
        './uploads',
        1767225600000,
        1767225600000
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_s3_endpoint',
        '',
        1767225600000,
        1767225600000
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_s3_region',
        'auto',
        1767225600000,
        1767225600000
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_s3_bucket',
        '',
        1767225600000,
        1767225600000
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_s3_access_key_id',
        '',
        1767225600000,
        1767225600000
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_s3_secret_access_key',
        '',
        1767225600000,
        1767225600000
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
      VALUES ('file', ?, ?, ?, ?)
    
      `,
      params: [
        'file_s3_signed_url_ttl_seconds',
        '300',
        1767225600000,
        1767225600000
      ],
    },
    `
      INSERT IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES (1, 'admin.system.file', 1767225600000, 1767225600000)
    
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
      VALUES (?, ?, '文件管理', ?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'admin.system.file.view',
        '查看文件列表',
        'GET',
        '/admin/system/file',
        '*',
        800,
        1767225600000,
        1767225600000
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
      VALUES (?, ?, '文件管理', ?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'admin.system.file.upload',
        '上传文件',
        'POST',
        '/admin/system/file',
        'upload',
        801,
        1767225600000,
        1767225600000
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
      VALUES (?, ?, '文件管理', ?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'admin.system.file.delete',
        '删除文件',
        'POST',
        '/admin/system/file',
        'delete',
        802,
        1767225600000,
        1767225600000
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
        'admin.system.file.view',
        1767225600000,
        1767225600000
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
        'admin.system.file.upload',
        1767225600000,
        1767225600000
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
        'admin.system.file.delete',
        1767225600000,
        1767225600000
      ],
    }
  ],
}
