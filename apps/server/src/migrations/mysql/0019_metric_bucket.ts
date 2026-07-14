import type { Migration, MigrationStatement } from '../types'

const seedTime = 1767225600000

// 通用统计桶。owner_id / dimension_* 用空字符串表示"空",避开唯一约束里多个 NULL 互不相等的陷阱。
export const migration0019MetricBucket: Migration = {
  id: '0019_metric_bucket',
  name: 'add generic metric bucket table and rollup jobs',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_metric_bucket (
        id INT AUTO_INCREMENT PRIMARY KEY,
        namespace VARCHAR(64) NOT NULL,
        metric_key VARCHAR(120) NOT NULL,
        grain VARCHAR(16) NOT NULL,
        bucket_start BIGINT NOT NULL,
        owner_type VARCHAR(16) NOT NULL DEFAULT 'global',
        owner_id VARCHAR(64) NOT NULL DEFAULT '',
        dimension_type VARCHAR(32) NOT NULL DEFAULT '',
        dimension_id VARCHAR(120) NOT NULL DEFAULT '',
        value DECIMAL(20, 4) NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        UNIQUE KEY uniq_sys_metric_bucket (
          namespace, metric_key, grain, bucket_start,
          owner_type, owner_id, dimension_type, dimension_id
        )
      )
    `,
    `
      CREATE INDEX idx_sys_metric_bucket_query
      ON sys_metric_bucket (
        namespace, metric_key, owner_type, owner_id, grain, bucket_start
      )
    `,
    createJobSeed(
      'rollup-system-metrics',
      '每 5 分钟重算 5m 与当前小时统计桶',
      '*/5 * * * *',
      'rollup-system-metrics',
    ),
    createJobSeed(
      'compact-system-metrics',
      '每小时从操作日志重算 hour 桶并清理过期 5m 桶',
      '0 * * * *',
      'compact-system-metrics',
    ),
  ],
}

function createJobSeed(
  name: string,
  description: string,
  expression: string,
  handlerKey: string,
): MigrationStatement {
  return {
    sql: `
      INSERT IGNORE INTO sys_scheduled_job (
        name, description, expression, handler_key, params,
        status, is_running, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, NULL, 'active', 0, ?, ?)
    `,
    params: [name, description, expression, handlerKey, seedTime, seedTime],
  }
}
