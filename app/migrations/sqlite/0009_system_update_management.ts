import type { Migration, MigrationStatement } from '../types'

const seedTime = 1767225600000

const updateConfigSeeds: Array<{
  configKey: string
  configValue: string
}> = [
  { configKey: 'update_check_url', configValue: '' },
  { configKey: 'update_latest_version', configValue: '' },
  { configKey: 'update_release_url', configValue: '' },
  { configKey: 'update_release_notes', configValue: '' },
  { configKey: 'update_checked_at', configValue: '' },
  { configKey: 'update_ignored_version', configValue: '' },
]

const updatePermissionSeeds: Array<{
  actionKey: string
  code: string
  methodPattern: string
  name: string
  pathPattern: string
  sortOrder: number
}> = [
  permission('admin.system.update.view', '查看更新管理', 'GET', '/admin/system/update', '*', 820),
  permission('admin.system.update.status', '查看更新状态', 'GET', '/admin/system/update/status', '*', 821),
  permission('admin.system.update.check', '检测更新', 'POST', '/admin/system/update', 'check', 822),
  permission('admin.system.update.handle', '处理更新', 'POST', '/admin/system/update', 'handle', 823),
]

export const migration0009SystemUpdateManagement: Migration = {
  id: '0009_system_update_management',
  name: 'add system update management',
  statements: [
    ...ensureConfigTableSupportsFileType(),
    `
      UPDATE sys_config
      SET config_type = 'file'
      WHERE config_type = 'system'
        AND config_key LIKE 'file_%'
    `,
    ...rebuildFileTableForShortUploadTypes(),
    ...updateConfigSeeds.map(createSystemConfigInsert),
    `
      INSERT OR IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES (1, 'admin.system.update', '${seedTime}', '${seedTime}')
    `,
    ...updatePermissionSeeds.map(createPermissionInsert),
    ...updatePermissionSeeds.map((permission) =>
      createRolePermissionInsert(1, permission.code)
    ),
  ],
}

function rebuildFileTableForShortUploadTypes(): MigrationStatement[] {
  return [
    `
      CREATE TABLE IF NOT EXISTS sys_file_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upload_type TEXT NOT NULL CHECK (
          upload_type IN ('avatar', 'notification', 'page')
        ),
        storage_mode TEXT NOT NULL CHECK (storage_mode IN ('local', 's3')),
        storage_key TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        user_id INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `,
    `
      INSERT OR IGNORE INTO sys_file_next (
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
    'DROP TABLE sys_file',
    'ALTER TABLE sys_file_next RENAME TO sys_file',
    `
      CREATE INDEX IF NOT EXISTS idx_sys_file_upload_type_created_at
      ON sys_file (upload_type, created_at, id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_sys_file_user_id_created_at
      ON sys_file (user_id, created_at, id)
    `,
  ]
}

function ensureConfigTableSupportsFileType(): MigrationStatement[] {
  return [
    `
      CREATE TABLE IF NOT EXISTS config_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_type TEXT NOT NULL CHECK (config_type IN ('site', 'system', 'file')),
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE (config_type, config_key)
      )
    `,
    `
      INSERT OR IGNORE INTO config_next (
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
    'DROP TABLE sys_config',
    'ALTER TABLE config_next RENAME TO sys_config',
  ]
}

function createSystemConfigInsert(
  seed: { configKey: string, configValue: string },
): MigrationStatement {
  return {
    sql: `
      INSERT OR IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('system', ?, ?, ?, ?)
    `,
    params: [seed.configKey, seed.configValue, seedTime, seedTime],
  }
}

function permission(
  code: string,
  name: string,
  methodPattern: string,
  pathPattern: string,
  actionKey: string,
  sortOrder: number,
) {
  return { actionKey, code, methodPattern, name, pathPattern, sortOrder }
}

function createPermissionInsert(
  seed: {
    actionKey: string
    code: string
    methodPattern: string
    name: string
    pathPattern: string
    sortOrder: number
  },
): MigrationStatement {
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
      VALUES (?, ?, '更新管理', ?, ?, ?, ?, ?, ?)
    `,
    params: [
      seed.code,
      seed.name,
      seed.methodPattern,
      seed.pathPattern,
      seed.actionKey,
      seed.sortOrder,
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
