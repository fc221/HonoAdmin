import type { Migration } from '../types'

export const migration0003UserContactStatus: Migration = {
  id: '0003_user_contact_status',
  name: 'add user contact and status fields',
  statements: [
    `ALTER TABLE sys_user ADD COLUMN mail VARCHAR(255)
    `,
    `ALTER TABLE sys_user ADD COLUMN phone VARCHAR(30)
    `,
    `
      ALTER TABLE sys_user
      ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'normal'
      CHECK (status IN ('normal', 'disabled'))
    
    `
  ],
}
