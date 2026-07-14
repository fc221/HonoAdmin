import type { ServiceContext } from '../../types'
import type { MetricBucketInput, MetricGrain } from './entity'
import { getMetricUpdatedAt, replaceMetricBuckets } from './index'

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
// compact 每小时从源重算最近 N 个已结束小时。窗口越宽,越长的调度中断也能自愈;
// 25 小时覆盖整天中断,每次只是 N 次带索引的范围 COUNT,成本可忽略。
// ponytail: 中断超过该窗口的小时需调大此值或手动重跑;operate_log 保留 30 天,上限可到 7 天。
const COMPACT_BACKFILL_HOURS = 25
// 5m 桶保留 48 小时;它是细粒度层,当前仪表盘只读 hour 桶。
const FIVE_MINUTE_RETENTION_MS = 48 * HOUR_MS

// rollup-system-metrics:每 5 分钟重算「当前」和「上一个」5m 桶(细粒度层 + 5 分钟「更新于」新鲜度),
// 并直接从源重算「当前 hour 桶」,让当前小时立刻进趋势且精确,不必等整点 compact。
// 全部重算而非累加,配合覆盖写,Cron 重试或重复执行结果一致。
export async function rollupSystemMetrics(ctx: ServiceContext): Promise<string> {
  const now = ctx.now()
  const currentFiveMin = floorTo(now, FIVE_MINUTES_MS)
  const currentHour = floorTo(now, HOUR_MS)

  const buckets: MetricBucketInput[] = []
  for (const start of [currentFiveMin - FIVE_MINUTES_MS, currentFiveMin]) {
    buckets.push(operateBucket('5m', start, await countOperateLogsInRange(ctx, start, start + FIVE_MINUTES_MS)))
  }
  buckets.push(operateBucket('hour', currentHour, await countOperateLogsInRange(ctx, currentHour, currentHour + HOUR_MS)))

  await replaceMetricBuckets(ctx, buckets)
  return '已更新 2 个 5m 桶和当前小时桶'
}

// compact-system-metrics:直接从 operate_log 重算最近 N 个已结束 hour 桶(而非求和 5m 桶),
// 再删除超过 48h 的 5m 桶。从源重算意味着即便某段时间调度中断、5m 桶有缺口,hour 桶仍精确且能自愈。
export async function compactSystemMetrics(ctx: ServiceContext): Promise<string> {
  const currentHour = floorTo(ctx.now(), HOUR_MS)

  const buckets: MetricBucketInput[] = []
  for (let offset = COMPACT_BACKFILL_HOURS; offset >= 1; offset -= 1) {
    const hourStart = currentHour - offset * HOUR_MS
    buckets.push(operateBucket('hour', hourStart, await countOperateLogsInRange(ctx, hourStart, hourStart + HOUR_MS)))
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

function operateBucket(grain: MetricGrain, bucketStart: number, value: number): MetricBucketInput {
  return {
    bucketStart,
    grain,
    metricKey: OPERATE_COUNT_METRIC,
    namespace: SYSTEM_METRIC_NAMESPACE,
    ownerType: GLOBAL_OWNER,
    value,
  }
}

function floorTo(timestamp: number, unit: number): number {
  return Math.floor(timestamp / unit) * unit
}
