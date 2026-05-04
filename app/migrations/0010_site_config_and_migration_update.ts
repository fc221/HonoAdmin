import type { Migration, MigrationStatement } from './types'

const seedTime = '2026-01-01T00:00:00.000Z'

const siteConfigSeeds: Array<{
  configKey: string
  configValue: string
}> = [
  { configKey: 'site_subtitle', configValue: '' },
  { configKey: 'site_keywords', configValue: '' },
  { configKey: 'site_description', configValue: '' },
]

const obsoleteUpdateConfigKeys = [
  'update_check_url',
  'update_latest_version',
  'update_release_url',
  'update_release_notes',
  'update_checked_at',
  'update_ignored_version',
]

const obsoleteUpdatePermissionCodes = [
  'admin.system.update.check',
  'admin.system.update.handle',
]

export const migration0010SiteConfigAndMigrationUpdate: Migration = {
  id: '0010_site_config_and_migration_update',
  name: 'add site config fields and migration-only update management',
  statements: [
    ...siteConfigSeeds.map(createSiteConfigInsert),
    createDeleteConfigByKeys(obsoleteUpdateConfigKeys),
    createDeleteRolePermissionsByCodes(obsoleteUpdatePermissionCodes),
    createDeletePermissionsByCodes(obsoleteUpdatePermissionCodes),
    createMigrationPermissionInsert(),
    createRolePermissionInsert(1, 'admin.system.update.migrate'),
  ],
}

function createSiteConfigInsert(
  seed: { configKey: string, configValue: string },
): MigrationStatement {
  return {
    sql: `
      INSERT OR IGNORE INTO config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('site', ?, ?, ?, ?)
    `,
    params: [seed.configKey, seed.configValue, seedTime, seedTime],
  }
}

function createDeleteConfigByKeys(keys: string[]): MigrationStatement {
  return {
    sql: `
      DELETE FROM config
      WHERE config_type = 'system'
        AND config_key IN (${createPlaceholders(keys)})
    `,
    params: keys,
  }
}

function createDeleteRolePermissionsByCodes(codes: string[]): MigrationStatement {
  return {
    sql: `
      DELETE FROM sys_role_permission
      WHERE permission_code IN (${createPlaceholders(codes)})
    `,
    params: codes,
  }
}

function createDeletePermissionsByCodes(codes: string[]): MigrationStatement {
  return {
    sql: `
      DELETE FROM sys_permission
      WHERE code IN (${createPlaceholders(codes)})
    `,
    params: codes,
  }
}

function createMigrationPermissionInsert(): MigrationStatement {
  return {
    sql: `
      INSERT OR IGNORE INTO sys_permission (
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
    params: [seedTime, seedTime],
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

function createPlaceholders(values: unknown[]): string {
  return values.map(() => '?').join(', ')
}
