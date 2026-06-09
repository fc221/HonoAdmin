import type { Migration } from '../types'

export const migration0007AdminPermissionActions: Migration = {
  id: '0007_admin_permission_actions',
  name: 'add admin permission action keys',
  statements: [
    `
      ALTER TABLE sys_permission
      ADD COLUMN action_key VARCHAR(255) NOT NULL DEFAULT '*'
    
    `,
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'create',
        'admin.web.page.create'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'update',
        'admin.web.page.update'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'delete',
        'admin.web.page.delete'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'create',
        'admin.web.notification.create'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'update',
        'admin.web.notification.update'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'delete',
        'admin.web.notification.delete'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'update',
        'admin.web.feedback.update'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'delete',
        'admin.web.feedback.delete'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'update-values',
        'admin.system.config.update'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'create',
        'admin.system.role.create'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'update',
        'admin.system.role.update'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'delete',
        'admin.system.role.delete'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'create',
        'admin.system.user.create'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'update',
        'admin.system.user.update'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'delete',
        'admin.system.user.delete'
      ],
    },
    {
      sql: `
      UPDATE sys_permission
      SET action_key = ?
      WHERE code = ?
    
      `,
      params: [
        'delete',
        'admin.system.operate-log.delete'
      ],
    }
  ],
}
