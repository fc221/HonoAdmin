import type { Migration } from '../types'

const seedTime = '2026-01-01T00:00:00.000Z'

export const migration0001AdminCore: Migration = {
  id: '0001_admin_core',
  name: 'create admin core tables',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_type TEXT NOT NULL CHECK (config_type IN ('site', 'system')),
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (config_type, config_key)
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        nickname TEXT,
        avatar TEXT,
        is_root INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `,
    {
      sql: `
        INSERT OR IGNORE INTO sys_config (
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
        seedTime,
        seedTime,
      ],
    },
    {
      sql: `
        INSERT OR IGNORE INTO sys_config (
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
        seedTime,
        seedTime,
      ],
    },
  ],
}
