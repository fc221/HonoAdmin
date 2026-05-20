import type { Migration } from '../types'

export const migration0016RemoveAdminWildcardPolicy: Migration = {
  id: '0016_remove_admin_wildcard_policy',
  name: 'remove admin wildcard role policy',
  statements: [
    `
      DELETE FROM sys_role_policy
      WHERE role_id IN (
        SELECT id FROM sys_role WHERE code = 'admin'
      )
      AND path_pattern IN ('/admin', '/admin/*')
      AND method_pattern = '*'
    `,
  ],
}
