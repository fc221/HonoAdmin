// 第一版支持的统计粒度。新增粒度在此追加,不在调用方散落字符串。
export const metricGrains = ['5m', 'hour'] as const
export type MetricGrain = (typeof metricGrains)[number]

// sys_metric_bucket 的数据库行。value 在 pg/mysql 上以 NUMERIC/DECIMAL 返回,可能是字符串,读侧统一转数字。
export interface MetricBucketRow {
  bucket_start: number
  dimension_id: string
  dimension_type: string
  grain: string
  metric_key: string
  namespace: string
  owner_id: string
  owner_type: string
  updated_at: number
  value: number | string
}

/**
 * 写入一个统计桶的绝对值(不是增量)。
 * owner_id / dimension_type / dimension_id 省略即视为空字符串"",与唯一约束保持一致。
 */
export interface MetricBucketInput {
  bucketStart: number
  dimensionId?: string
  dimensionType?: string
  grain: MetricGrain
  metricKey: string
  namespace: string
  ownerId?: string
  ownerType: string
  value: number
}
