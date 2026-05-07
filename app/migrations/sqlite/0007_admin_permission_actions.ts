import type { Migration, MigrationStatement } from '../types'

const permissionActions: Array<[code: string, actionKey: string]> = [
  ['admin.web.page.create', 'create'],
  ['admin.web.page.update', 'update'],
  ['admin.web.page.delete', 'delete'],
  ['admin.web.notification.create', 'create'],
  ['admin.web.notification.update', 'update'],
  ['admin.web.notification.delete', 'delete'],
  ['admin.web.feedback.update', 'update'],
  ['admin.web.feedback.delete', 'delete'],
  ['admin.system.config.update', 'update-values'],
  ['admin.system.role.create', 'create'],
  ['admin.system.role.update', 'update'],
  ['admin.system.role.delete', 'delete'],
  ['admin.system.user.create', 'create'],
  ['admin.system.user.update', 'update'],
  ['admin.system.user.delete', 'delete'],
  ['admin.system.operate-log.delete', 'delete'],
]

export const migration0007AdminPermissionActions: Migration = {
  id: '0007_admin_permission_actions',
  name: 'add admin permission action keys',
  statements: [
    `
      ALTER TABLE sys_permission
      ADD COLUMN action_key TEXT NOT NULL DEFAULT '*'
    `,
    ...permissionActions.map(createActionUpdate),
  ],
}

function createActionUpdate(
  [code, actionKey]: [code: string, actionKey: string],
): MigrationStatement {
  return {
    sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    `,
    params: [actionKey, code],
  }
}
