import type { Migration } from '../types'

export const migration0018SecurityRateLimitConfig: Migration = {
  id: '0018_security_rate_limit_config',
  name: 'seed security rate limit config',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS config_security_next (
        id SERIAL PRIMARY KEY,
        config_type VARCHAR(30) NOT NULL CHECK (
          config_type IN ('site', 'system', 'file', 'security')
        ),
        config_key VARCHAR(255) NOT NULL,
        config_value TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE (config_type, config_key)
      )
    `,
    `
      INSERT INTO config_security_next (
        id,
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      SELECT
        id,
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      FROM sys_config
      ON CONFLICT DO NOTHING
    `,
    `
      SELECT setval(
        pg_get_serial_sequence('config_security_next', 'id'),
        COALESCE((SELECT MAX(id) FROM config_security_next), 1),
        (SELECT MAX(id) FROM config_security_next) IS NOT NULL
      )
    `,
    `DROP TABLE sys_config`,
    `ALTER TABLE config_security_next RENAME TO sys_config`,
    {
      sql: `
      INSERT INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('security', ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
      `,
      params: [
        'api_rate_limit_enabled',
        'true',
        1767225600000,
        1767225600000
      ],
    },
    {
      sql: `
      INSERT INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('security', ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
      `,
      params: [
        'api_rate_limit_max',
        '120',
        1767225600000,
        1767225600000
      ],
    },
    {
      sql: `
      INSERT INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('security', ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
      `,
      params: [
        'api_rate_limit_window_seconds',
        '60',
        1767225600000,
        1767225600000
      ],
    },
    {
      sql: `
      INSERT INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('security', ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
      `,
      params: [
        'login_rate_limit_ip_max',
        '30',
        1767225600000,
        1767225600000
      ],
    },
    {
      sql: `
      INSERT INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('security', ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
      `,
      params: [
        'login_rate_limit_account_max',
        '10',
        1767225600000,
        1767225600000
      ],
    },
    {
      sql: `
      INSERT INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('security', ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
      `,
      params: [
        'login_rate_limit_window_seconds',
        '900',
        1767225600000,
        1767225600000
      ],
    },
  ],
}
