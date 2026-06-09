import type { Migration } from '../types'

export const migration0003UserContactStatus: Migration = {
  id: '0003_user_contact_status',
  name: 'add user contact and status fields',
  statements: [
    'ALTER TABLE sys_user ADD COLUMN mail TEXT',
    'ALTER TABLE sys_user ADD COLUMN phone TEXT',
    `
      ALTER TABLE sys_user
      ADD COLUMN status TEXT NOT NULL DEFAULT 'normal'
      CHECK (status IN ('normal', 'disabled'))
    `,
  ],
}
