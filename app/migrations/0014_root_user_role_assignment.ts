import type { Migration } from './types'

const seedTime = '2026-01-01T00:00:00.000Z'

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
        "user".id,
        role.id,
        '${seedTime}',
        '${seedTime}'
      FROM "user"
      INNER JOIN sys_role role
        ON role.code = 'admin'
      WHERE "user".is_root = 1
    `,
    `
      INSERT OR IGNORE INTO sys_user_role (
        user_id,
        role_id,
        created_at,
        updated_at
      )
      SELECT
        "user".id,
        role.id,
        '${seedTime}',
        '${seedTime}'
      FROM "user"
      INNER JOIN sys_role role
        ON role.code = 'user'
      WHERE "user".is_root = 1
    `,
    `
      UPDATE "user"
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
