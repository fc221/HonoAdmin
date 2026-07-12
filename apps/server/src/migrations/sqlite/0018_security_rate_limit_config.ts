import type { Migration, MigrationStatement } from '../types'

const seedTime = 1767225600000

// 限流阈值改为后台「安全配置」可改。默认值与 defaultSecurityRuntimeConfig 一致,但这里写死不 import:
// 迁移是历史快照,不能跟着代码里的默认值漂移。
const securityConfigSeeds: Array<{ configKey: string, configValue: string }> = [
  { configKey: 'api_rate_limit_enabled', configValue: 'true' },
  { configKey: 'api_rate_limit_max', configValue: '120' },
  { configKey: 'api_rate_limit_window_seconds', configValue: '60' },
  { configKey: 'login_rate_limit_ip_max', configValue: '30' },
  { configKey: 'login_rate_limit_account_max', configValue: '10' },
  { configKey: 'login_rate_limit_window_seconds', configValue: '900' },
]

export const migration0018SecurityRateLimitConfig: Migration = {
  id: '0018_security_rate_limit_config',
  name: 'seed security rate limit config',
  statements: [
    // config_type 上有 CHECK 约束,不放宽的话 'security' 会被 INSERT OR IGNORE 静默吞掉。
    ...rebuildConfigTableForSecurityType(),
    ...securityConfigSeeds.map(createSecurityConfigInsert),
  ],
}

function rebuildConfigTableForSecurityType(): MigrationStatement[] {
  return [
    `
      CREATE TABLE IF NOT EXISTS config_security_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_type TEXT NOT NULL CHECK (
          config_type IN ('site', 'system', 'file', 'security')
        ),
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE (config_type, config_key)
      )
    `,
    `
      INSERT OR IGNORE INTO config_security_next (
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
    `,
    'DROP TABLE sys_config',
    'ALTER TABLE config_security_next RENAME TO sys_config',
  ]
}

function createSecurityConfigInsert(
  seed: { configKey: string, configValue: string },
): MigrationStatement {
  return {
    sql: `
      INSERT OR IGNORE INTO sys_config (
        config_type,
        config_key,
        config_value,
        created_at,
        updated_at
      )
      VALUES ('security', ?, ?, ?, ?)
    `,
    params: [seed.configKey, seed.configValue, seedTime, seedTime],
  }
}
