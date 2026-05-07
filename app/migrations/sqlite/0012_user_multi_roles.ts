import type { Migration } from '../types'

export const migration0012UserMultiRoles: Migration = {
  id: '0012_user_multi_roles',
  name: 'add multi role assignments for users',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_user_role (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (user_id, role_id)
      )
    `,
    `
      INSERT OR IGNORE INTO sys_user_role (
        user_id,
        role_id,
        created_at,
        updated_at
      )
      SELECT
        id,
        role_id,
        created_at,
        updated_at
      FROM sys_user
      WHERE role_id IS NOT NULL
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_user_role_user_id
      ON sys_user_role (user_id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_user_role_role_id
      ON sys_user_role (role_id)
    `,
  ],
}
