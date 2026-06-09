import type { Migration } from '../types'

const seedTime = 1767225600000

export const migration0014RootUserRoleAssignment: Migration = {
  id: '0014_root_user_role_assignment',
  name: 'assign admin and user roles to root users',
  statements: [
    `
      INSERT OR IGNORE INTO sys_user_role (
        user_id,
        role_id,
        created_at,
        updated_at
      )
      SELECT
        sys_user.id,
        role.id,
        '${seedTime}',
        '${seedTime}'
      FROM sys_user
      INNER JOIN sys_role role
        ON role.code = 'admin'
      WHERE sys_user.is_root = 1
    `,
    `
      INSERT OR IGNORE INTO sys_user_role (
        user_id,
        role_id,
        created_at,
        updated_at
      )
      SELECT
        sys_user.id,
        role.id,
        '${seedTime}',
        '${seedTime}'
      FROM sys_user
      INNER JOIN sys_role role
        ON role.code = 'user'
      WHERE sys_user.is_root = 1
    `,
    `
      UPDATE sys_user
      SET role_id = (
        SELECT id FROM sys_role WHERE code = 'admin'
      )
      WHERE is_root = 1
      AND EXISTS (
        SELECT 1 FROM sys_role WHERE code = 'admin'
      )
    `,
  ],
}
