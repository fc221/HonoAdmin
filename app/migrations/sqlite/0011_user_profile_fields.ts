import type { Migration } from '../types'

export const migration0011UserProfileFields: Migration = {
  id: '0011_user_profile_fields',
  name: 'add user profile fields',
  statements: [
    `
      ALTER TABLE sys_user
      ADD COLUMN gender TEXT
      CHECK (gender IN ('male', 'female', 'other'))
    `,
    'ALTER TABLE sys_user ADD COLUMN bio TEXT',
  ],
}
