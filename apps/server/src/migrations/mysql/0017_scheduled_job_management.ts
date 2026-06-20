import type { Migration, MigrationStatement } from '../types'

const seedTime = 1767225600000

const cronPermissionSeeds: Array<{
  actionKey: string
  code: string
  methodPattern: string
  name: string
  pathPattern: string
  sortOrder: number
}> = [
  permission('admin.system.cron.view', '查看定时任务', 'GET', '/admin/system/cron', '*', 900),
  permission('admin.system.cron.create', '新增定时任务', 'POST', '/admin/system/cron', 'create', 901),
  permission('admin.system.cron.edit', '编辑定时任务', 'POST', '/admin/system/cron', 'edit', 902),
  permission('admin.system.cron.delete', '删除定时任务', 'POST', '/admin/system/cron', 'delete', 903),
  permission('admin.system.cron.run', '手动执行定时任务', 'POST', '/admin/system/cron', 'run', 904),
]

export const migration0017ScheduledJobManagement: Migration = {
  id: '0017_scheduled_job_management',
  name: 'add scheduled job management',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_scheduled_job (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL UNIQUE,
        description TEXT,
        expression VARCHAR(120) NOT NULL,
        handler_key VARCHAR(190) NOT NULL,
        params TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        is_running INT NOT NULL DEFAULT 0,
        run_started_at BIGINT,
        last_run_at BIGINT,
        next_run_at BIGINT,
        last_result TEXT,
        last_status VARCHAR(20),
        last_duration_ms INT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `,
    `
      CREATE INDEX idx_sys_scheduled_job_status_next
      ON sys_scheduled_job (status, next_run_at)
    `,
    {
      sql: `
        INSERT IGNORE INTO sys_scheduled_job (
          name,
          description,
          expression,
          handler_key,
          params,
          status,
          is_running,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'inactive', 0, ?, ?)
      `,
      params: [
        'purge-operate-log',
        '清理 30 天前的操作日志',
        '0 3 * * *',
        'purge-operate-log',
        '["30"]',
        seedTime,
        seedTime,
      ],
    },
    `
      INSERT IGNORE INTO sys_role_menu (
        role_id,
        menu_name,
        created_at,
        updated_at
      )
      VALUES (1, 'admin.system.cron', ${seedTime}, ${seedTime})
    `,
    ...cronPermissionSeeds.map(createPermissionInsert),
    ...cronPermissionSeeds.map((seed) => createRolePermissionInsert(1, seed.code)),
  ],
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
      VALUES (?, ?, '定时任务', ?, ?, ?, ?, ?, ?)
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
      INSERT IGNORE INTO sys_role_permission (
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
