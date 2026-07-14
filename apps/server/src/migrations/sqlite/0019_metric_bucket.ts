import type { Migration, MigrationStatement } from '../types'

const seedTime = 1767225600000

// 通用统计桶:任意业务域(namespace)按时间桶(grain)存指标绝对值。
// owner_id / dimension_* 用空字符串表示"空",不用 NULL —— SQL 唯一约束里多个 NULL 互不相等,
// 会让全局桶(owner_id 为空)的唯一性失效、覆盖写(先删后插)命中不到旧行。
export const migration0019MetricBucket: Migration = {
  id: '0019_metric_bucket',
  name: 'add generic metric bucket table and rollup jobs',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS sys_metric_bucket (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        namespace TEXT NOT NULL,
        metric_key TEXT NOT NULL,
        grain TEXT NOT NULL,
        bucket_start INTEGER NOT NULL,
        owner_type TEXT NOT NULL DEFAULT 'global',
        owner_id TEXT NOT NULL DEFAULT '',
        dimension_type TEXT NOT NULL DEFAULT '',
        dimension_id TEXT NOT NULL DEFAULT '',
        value NUMERIC NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        UNIQUE (
          namespace, metric_key, grain, bucket_start,
          owner_type, owner_id, dimension_type, dimension_id
        )
      )
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_sys_metric_bucket_query
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
      INSERT OR IGNORE INTO sys_scheduled_job (
        name, description, expression, handler_key, params,
        status, is_running, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, NULL, 'active', 0, ?, ?)
    `,
    params: [name, description, expression, handlerKey, seedTime, seedTime],
  }
}
