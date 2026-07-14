import type { SQLParameter } from '@hono-admin/db'
import type { ServiceContext } from '../../types'
import type { MetricSeriesQuery } from './dto'
import type { MetricBucketInput, MetricBucketRow } from './entity'
import { metricSeriesQuerySchema } from './dto'

export type { MetricSeriesQuery } from './dto'
export type { MetricGrain } from './entity'
export type { MetricBucketInput } from './entity'

export interface MetricSeriesPoint {
  bucketStart: number
  dimensionId: string
  dimensionType: string
  value: number
}

const bucketKeyColumns
  = 'namespace, metric_key, grain, bucket_start, owner_type, owner_id, dimension_type, dimension_id'

/**
 * 绝对值覆盖写入一批统计桶。同一唯一键先删后插,放在同一事务里,
 * 所以 Cron 重试或重复执行不会翻倍。不用 upsert 是因为三方言 ON CONFLICT /
 * ON DUPLICATE 语法不同、sql-normalize 不处理;DELETE + INSERT 三方言一致。
 */
export async function replaceMetricBuckets(
  ctx: ServiceContext,
  buckets: MetricBucketInput[],
): Promise<void> {
  if (buckets.length === 0) {
    return
  }

  const updatedAt = ctx.now()

  await ctx.db.transaction(async (db) => {
    const statements: Array<{ params: SQLParameter[], sql: string }> = []

    for (const bucket of buckets) {
      const key = bucketKeyParams(bucket)
      statements.push({
        params: key,
        sql: `
          DELETE FROM sys_metric_bucket
          WHERE namespace = ? AND metric_key = ? AND grain = ? AND bucket_start = ?
            AND owner_type = ? AND owner_id = ? AND dimension_type = ? AND dimension_id = ?
        `,
      })
      statements.push({
        params: [...key, bucket.value, updatedAt],
        sql: `
          INSERT INTO sys_metric_bucket (${bucketKeyColumns}, value, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      })
    }

    await db.batch(statements)
  })
}

/**
 * 读取一个指标在明确时间范围内的桶序列(升序)。
 * start/end 必填且 end>start,由 schema 强制,禁止无界查询。
 * 不传 dimensionType/dimensionId 时返回该 owner 下所有维度的桶,由调用方聚合。
 */
export async function queryMetricSeries(
  ctx: ServiceContext,
  query: MetricSeriesQuery,
): Promise<MetricSeriesPoint[]> {
  const parsed = metricSeriesQuerySchema.parse(query)

  const conditions = [
    'namespace = ?',
    'metric_key = ?',
    'grain = ?',
    'owner_type = ?',
    'owner_id = ?',
    'bucket_start >= ?',
    'bucket_start < ?',
  ]
  const params: SQLParameter[] = [
    parsed.namespace,
    parsed.metricKey,
    parsed.grain,
    parsed.ownerType,
    parsed.ownerId,
    parsed.start,
    parsed.end,
  ]

  if (parsed.dimensionType !== undefined) {
    conditions.push('dimension_type = ?')
    params.push(parsed.dimensionType)
  }
  if (parsed.dimensionId !== undefined) {
    conditions.push('dimension_id = ?')
    params.push(parsed.dimensionId)
  }

  const rows = await ctx.db.query<MetricBucketRow>(
    `
      SELECT bucket_start, dimension_type, dimension_id, value
      FROM sys_metric_bucket
      WHERE ${conditions.join(' AND ')}
      ORDER BY bucket_start ASC
    `,
    params,
  )

  return rows.map((row) => ({
    bucketStart: Number(row.bucket_start),
    dimensionId: row.dimension_id,
    dimensionType: row.dimension_type,
    value: Number(row.value),
  }))
}

/**
 * 某业务域最新桶的更新时间(毫秒),用于仪表盘「更新于」展示;无数据返回 null。
 * 只读单行,走查询索引,不扫描历史。
 */
export async function getMetricUpdatedAt(
  ctx: ServiceContext,
  namespace: string,
): Promise<number | null> {
  const row = await ctx.db
    .first<{ updated_at: number | null }>(
      'SELECT MAX(updated_at) AS updated_at FROM sys_metric_bucket WHERE namespace = ?',
      [namespace],
    )
    .catch(() => null)
  const value = row?.updated_at
  return value == null ? null : Number(value)
}

function bucketKeyParams(bucket: MetricBucketInput): SQLParameter[] {
  return [
    bucket.namespace,
    bucket.metricKey,
    bucket.grain,
    bucket.bucketStart,
    bucket.ownerType,
    bucket.ownerId ?? '',
    bucket.dimensionType ?? '',
    bucket.dimensionId ?? '',
  ]
}
