import type { Migration } from '../types'

const seedTime = 1767225600000

export const migration0015FileS3PublicBaseUrl: Migration = {
  id: '0015_file_s3_public_base_url',
  name: 'add S3 public file base URL config',
  statements: [
    {
      params: [
        'file_s3_public_base_url',
        '',
        seedTime,
        seedTime,
      ],
      sql: `
        INSERT INTO sys_config (
          config_type,
          config_key,
          config_value,
          created_at,
          updated_at
        )
        VALUES ('file', ?, ?, ?, ?)
        ON CONFLICT (config_type, config_key) DO NOTHING
      `,
    },
  ],
}
