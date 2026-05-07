import type { Migration } from '../types'

export const migration0014RootUserRoleAssignment: Migration = {
  id: '0014_root_user_role_assignment',
  name: 'assign admin and user roles to root users',
  statements: [
    `
      INSERT INTO sys_user_role (
        user_id,
        role_id,
        created_at,
        updated_at
      )
      SELECT
        sys_user.id,
        role.id,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z'
      FROM sys_user
      INNER JOIN sys_role role
        ON role.code = 'admin'
      WHERE sys_user.is_root = 1
      ON CONFLICT DO NOTHING
    `,
    `
      INSERT INTO sys_user_role (
        user_id,
        role_id,
        created_at,
        updated_at
      )
      SELECT
        sys_user.id,
        role.id,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z'
      FROM sys_user
      INNER JOIN sys_role role
        ON role.code = 'user'
      WHERE sys_user.is_root = 1
      ON CONFLICT DO NOTHING
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
    
    `
  ],
}
