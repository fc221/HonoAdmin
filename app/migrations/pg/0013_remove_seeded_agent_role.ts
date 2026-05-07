import type { Migration } from '../types'

export const migration0013RemoveSeededAgentRole: Migration = {
  id: '0013_remove_seeded_agent_role',
  name: 'remove unused seeded agent role',
  statements: [
    `
      INSERT INTO sys_user_role (
        user_id,
        role_id,
        created_at,
        updated_at
      )
      SELECT
        user_role.user_id,
        fallback_role.id,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z'
      FROM sys_user_role user_role
      INNER JOIN sys_role agent_role
        ON agent_role.id = user_role.role_id
      INNER JOIN sys_role fallback_role
        ON fallback_role.code = 'user'
      WHERE agent_role.code = 'agent'
      ON CONFLICT DO NOTHING
    `,
    `
      UPDATE sys_user
      SET role_id = (
        SELECT id FROM sys_role WHERE code = 'user'
      )
      WHERE role_id IN (
        SELECT id FROM sys_role WHERE code = 'agent'
      )
      AND EXISTS (
        SELECT 1 FROM sys_role WHERE code = 'user'
      )
    
    `,
    `
      DELETE FROM sys_user_role
      WHERE role_id IN (
        SELECT id FROM sys_role WHERE code = 'agent'
      )
    
    `,
    `
      DELETE FROM sys_role_menu
      WHERE role_id IN (
        SELECT id FROM sys_role WHERE code = 'agent'
      )
    
    `,
    `
      DELETE FROM sys_role_policy
      WHERE role_id IN (
        SELECT id FROM sys_role WHERE code = 'agent'
      )
    
    `,
    `
      DELETE FROM sys_role_permission
      WHERE role_id IN (
        SELECT id FROM sys_role WHERE code = 'agent'
      )
    
    `,
    `
      DELETE FROM sys_role
      WHERE code = 'agent'
    
    `
  ],
}
