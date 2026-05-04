import type { Migration, MigrationStatement } from './types'

const seedTime = '2026-01-01T00:00:00.000Z'

const configSeeds: Array<{
  configKey: string
  configValue: string
}> = [
  { configKey: 'file_storage_driver', configValue: 'local' },
  { configKey: 'file_local_root', configValue: './uploads' },
  { configKey: 'file_s3_endpoint', configValue: '' },
  { configKey: 'file_s3_region', configValue: 'auto' },
  { configKey: 'file_s3_bucket', configValue: '' },
  { configKey: 'file_s3_access_key_id', configValue: '' },
  { configKey: 'file_s3_secret_access_key', configValue: '' },
  { configKey: 'file_s3_signed_url_ttl_seconds', configValue: '300' },
]

const permissionSeeds: Array<{
  actionKey: string
  code: string
  methodPattern: string
  name: string
  pathPattern: string
  sortOrder: number
}> = [
  permission('admin.system.file.view', '查看文件列表', 'GET', '/admin/system/file', '*', 800),
  permission('admin.system.file.upload', '上传文件', 'POST', '/admin/system/file', 'upload', 801),
  permission('admin.system.file.delete', '删除文件', 'POST', '/admin/system/file', 'delete', 802),
]

export const migration0008SystemFileManagement: Migration = {
  id: '0008_system_file_management',
  name: 'add system file management',
  statements: [
    ...rebuildConfigTableForFileType(),
    `
      CREATE TABLE IF NOT EXISTS sys_file (
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_sys_file_upload_type_created_at
      ON sys_file (upload_type, created_at, id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_sys_file_user_id_created_at
      ON sys_file (user_id, created_at, id)
    `,
    ...configSeeds.map(createFileConfigInsert),
    `
      INSERT OR IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES (1, 'admin.system.file', '${seedTime}', '${seedTime}')
    `,
    ...permissionSeeds.map(createPermissionInsert),
    ...permissionSeeds.map((permission) =>
      createRolePermissionInsert(1, permission.code)
    ),
  ],
}

function rebuildConfigTableForFileType(): MigrationStatement[] {
  return [
    `
      CREATE TABLE IF NOT EXISTS config_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_type TEXT NOT NULL CHECK (config_type IN ('site', 'system', 'file')),
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
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
      FROM config
    `,
    'DROP TABLE config',
    'ALTER TABLE config_next RENAME TO config',
  ]
}

function createFileConfigInsert(
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
      VALUES ('file', ?, ?, ?, ?)
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
      VALUES (?, ?, '文件管理', ?, ?, ?, ?, ?, ?)
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
