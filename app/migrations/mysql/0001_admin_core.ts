import type { Migration } from '../types'

export const migration0001AdminCore: Migration = {
  id: '0001_admin_core',
  name: 'create admin core tables',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_type VARCHAR(30) NOT NULL CHECK (config_type IN ('site', 'system')),
        config_key VARCHAR(255) NOT NULL,
        config_value TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE (config_type, config_key)
      )
    
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(40) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        nickname VARCHAR(80),
        avatar TEXT,
        is_root INT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    
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
        VALUES (?, ?, ?, ?, ?)
      
      `,
      params: [
        'site',
        'site_name',
        'HonoAdmin',
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
        VALUES (?, ?, ?, ?, ?)
      
      `,
      params: [
        'system',
        'maintenance_mode',
        'false',
        1767225600000,
        1767225600000
      ],
    }
  ],
}
