import type { ServiceContext } from '../../types'
import type { MetricBucketInput } from './entity'
import { getMetricUpdatedAt, queryMetricSeries, replaceMetricBuckets } from './index'

/**
 * HonoAdmin 内置的 system 域采集器,是通用统计底座的第一个使用者。
 * 只采集仪表盘真实展示的区间统计:操作日志数量。所有读操作都带时间范围,不扫描全部历史。
 *
 * 其它业务域(后续合并的项目)按同样方式扩展:用自己的 namespace 写一个 rollup handler,
 * 调 replaceMetricBuckets 写桶、用 queryMetricSeries 读桶,不复制本文件或统计表/查询模块。
 */

export const SYSTEM_METRIC_NAMESPACE = 'system'
export const OPERATE_COUNT_METRIC = 'operate_count'
const GLOBAL_OWNER = 'global'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
// compact 每小时容错重算最近几个已结束小时,避免单次漏桶(如上次执行失败)。
const COMPACT_HOURS = 3
// 5m 桶保留 48 小时;更早的已被 compact 汇总进 hour 桶。
const FIVE_MINUTE_RETENTION_MS = 48 * HOUR_MS

// rollup-system-metrics:每 5 分钟重算「当前」和「上一个」5m 桶,绝对值覆盖。
// 重算而非累加,配合覆盖写,Cron 重试或重复执行结果一致。
export async function rollupSystemMetrics(ctx: ServiceContext): Promise<string> {
  const currentStart = floorTo(ctx.now(), FIVE_MINUTES_MS)
  const starts = [currentStart - FIVE_MINUTES_MS, currentStart]

  const buckets: MetricBucketInput[] = []
  for (const start of starts) {
    buckets.push({
      bucketStart: start,
      grain: '5m',
      metricKey: OPERATE_COUNT_METRIC,
      namespace: SYSTEM_METRIC_NAMESPACE,
      ownerType: GLOBAL_OWNER,
      value: await countOperateLogsInRange(ctx, start, start + FIVE_MINUTES_MS),
    })
  }

  await replaceMetricBuckets(ctx, buckets)
  return `已更新 ${buckets.length} 个 5m 操作统计桶`
}

// compact-system-metrics:把已结束的 5m 桶汇总成 hour 桶(绝对值覆盖),再删除超过 48h 的 5m 桶。
export async function compactSystemMetrics(ctx: ServiceContext): Promise<string> {
  const currentHour = floorTo(ctx.now(), HOUR_MS)

  const buckets: MetricBucketInput[] = []
  for (let offset = COMPACT_HOURS; offset >= 1; offset -= 1) {
    const hourStart = currentHour - offset * HOUR_MS
    const points = await queryMetricSeries(ctx, {
      end: hourStart + HOUR_MS,
      grain: '5m',
      metricKey: OPERATE_COUNT_METRIC,
      namespace: SYSTEM_METRIC_NAMESPACE,
      ownerType: GLOBAL_OWNER,
      start: hourStart,
    })
    buckets.push({
      bucketStart: hourStart,
      grain: 'hour',
      metricKey: OPERATE_COUNT_METRIC,
      namespace: SYSTEM_METRIC_NAMESPACE,
      ownerType: GLOBAL_OWNER,
      value: points.reduce((total, point) => total + point.value, 0),
    })
  }

  await replaceMetricBuckets(ctx, buckets)

  const cutoff = floorTo(ctx.now(), FIVE_MINUTES_MS) - FIVE_MINUTE_RETENTION_MS
  const deleted = await ctx.db.execute(
    'DELETE FROM sys_metric_bucket WHERE namespace = ? AND grain = ? AND bucket_start < ?',
    [SYSTEM_METRIC_NAMESPACE, '5m', cutoff],
  )

  return `已汇总 ${buckets.length} 个 hour 桶,清理 ${deleted.rowsAffected} 个过期 5m 桶`
}

// 供仪表盘读取「更新于」时间。
export function getSystemMetricsUpdatedAt(ctx: ServiceContext): Promise<number | null> {
  return getMetricUpdatedAt(ctx, SYSTEM_METRIC_NAMESPACE)
}

// 带时间范围的计数,走 idx_operate_log_created_at_id,不做全表扫描。
async function countOperateLogsInRange(
  ctx: ServiceContext,
  start: number,
  end: number,
): Promise<number> {
  const row = await ctx.db
    .first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM sys_operate_log WHERE created_at >= ? AND created_at < ?',
      [start, end],
    )
    .catch(() => null)
  return Number(row?.count ?? 0)
}

function floorTo(timestamp: number, unit: number): number {
  return Math.floor(timestamp / unit) * unit
}
