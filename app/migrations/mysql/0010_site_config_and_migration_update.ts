import type { Migration } from '../types'

export const migration0010SiteConfigAndMigrationUpdate: Migration = {
  id: '0010_site_config_and_migration_update',
  name: 'add site config fields and migration-only update management',
  statements: [
    {
      sql: `
      INSERT IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('site', ?, ?, ?, ?)
    
      `,
      params: [
        'site_subtitle',
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
      VALUES ('site', ?, ?, ?, ?)
    
      `,
      params: [
        'site_keywords',
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
      VALUES ('site', ?, ?, ?, ?)
    
      `,
      params: [
        'site_description',
        '',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    },
    {
      sql: `
      DELETE FROM sys_config
      WHERE config_type = 'system'
        AND config_key IN (?, ?, ?, ?, ?, ?)
    
      `,
      params: [
        'update_check_url',
        'update_latest_version',
        'update_release_url',
        'update_release_notes',
        'update_checked_at',
        'update_ignored_version'
      ],
    },
    {
      sql: `
      DELETE FROM sys_role_permission
      WHERE permission_code IN (?, ?)
    
      `,
      params: [
        'admin.system.update.check',
        'admin.system.update.handle'
      ],
    },
    {
      sql: `
      DELETE FROM sys_permission
      WHERE code IN (?, ?)
    
      `,
      params: [
        'admin.system.update.check',
        'admin.system.update.handle'
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
      VALUES (
        'admin.system.update.migrate',
        '执行数据库迁移',
        '更新管理',
        'POST',
        '/admin/system/update',
        'migrate',
        822,
        ?,
        ?
      )
    
      `,
      params: [
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
        'admin.system.update.migrate',
        '2026-01-01 00:00:00.000',
        '2026-01-01 00:00:00.000'
      ],
    }
  ],
}
