import { describe, expect, test } from 'bun:test'
import { queryMetricSeries, replaceMetricBuckets } from '../apps/server/src/service/system/statistics'
import {
  compactSystemMetrics,
  OPERATE_COUNT_METRIC,
  rollupSystemMetrics,
  SYSTEM_METRIC_NAMESPACE,
} from '../apps/server/src/service/system/statistics/system-collector'
import { createTestServiceContext } from './helpers/service-context'

const HOUR = 60 * 60 * 1000
const FIVE_MIN = 5 * 60 * 1000

describe('metric bucket store', () => {
  test('replaceMetricBuckets overrides in place and never doubles', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const bucket = {
        bucketStart: 1000,
        grain: '5m' as const,
        metricKey: 'operate_count',
        namespace: 'test',
        ownerType: 'global',
        value: 5,
      }
      await replaceMetricBuckets(ctx, [bucket])
      await replaceMetricBuckets(ctx, [bucket]) // 重复执行不翻倍
      await replaceMetricBuckets(ctx, [{ ...bucket, value: 8 }]) // 覆盖旧值

      const points = await queryMetricSeries(ctx, {
        end: 2000,
        grain: '5m',
        metricKey: 'operate_count',
        namespace: 'test',
        ownerType: 'global',
        start: 0,
      })

      expect(points).toHaveLength(1)
      expect(points[0]?.value).toBe(8)
    } finally {
      await cleanup()
    }
  })

  test('owner and dimension are isolated', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const base = {
        bucketStart: 1000,
        grain: '5m' as const,
        metricKey: 'request_count',
        namespace: 'test',
      }
      await replaceMetricBuckets(ctx, [
        { ...base, ownerType: 'global', value: 100 },
        { ...base, ownerId: '1', ownerType: 'user', value: 3 },
        { ...base, ownerId: '2', ownerType: 'user', value: 7 },
        { ...base, dimensionId: 'x', dimensionType: 'model', ownerId: '1', ownerType: 'user', value: 2 },
      ])

      const query = (extra: Record<string, unknown>) => queryMetricSeries(ctx, {
        end: 2000,
        grain: '5m',
        metricKey: 'request_count',
        namespace: 'test',
        start: 0,
        ...extra,
      })

      const globalPoints = await query({ ownerType: 'global' })
      const user1All = await query({ ownerId: '1', ownerType: 'user' })
      const user1NoDim = await query({ dimensionId: '', dimensionType: '', ownerId: '1', ownerType: 'user' })
      const user2 = await query({ ownerId: '2', ownerType: 'user' })

      expect(globalPoints.map((p) => p.value)).toEqual([100])
      // user1 无维度过滤:返回自身两条(空维度 + model:x),不含 global / user2。
      expect(user1All.reduce((s, p) => s + p.value, 0)).toBe(5)
      expect(user1NoDim.map((p) => p.value)).toEqual([3])
      expect(user2.map((p) => p.value)).toEqual([7])
    } finally {
      await cleanup()
    }
  })

  test('queryMetricSeries returns only buckets inside the range and rejects unbounded ranges', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      await replaceMetricBuckets(ctx, [
        { bucketStart: 1000, grain: '5m', metricKey: 'm', namespace: 'test', ownerType: 'global', value: 1 },
        { bucketStart: 2000, grain: '5m', metricKey: 'm', namespace: 'test', ownerType: 'global', value: 2 },
        { bucketStart: 3000, grain: '5m', metricKey: 'm', namespace: 'test', ownerType: 'global', value: 3 },
      ])

      const windowed = await queryMetricSeries(ctx, {
        end: 2500,
        grain: '5m',
        metricKey: 'm',
        namespace: 'test',
        ownerType: 'global',
        start: 1500,
      })
      expect(windowed.map((p) => p.bucketStart)).toEqual([2000])

      // 无界范围(end <= start)必须被拒。
      await expect(queryMetricSeries(ctx, {
        end: 0,
        grain: '5m',
        metricKey: 'm',
        namespace: 'test',
        ownerType: 'global',
        start: 0,
      })).rejects.toThrow()
    } finally {
      await cleanup()
    }
  })
})

describe('system metric collectors', () => {
  test('rollup counts operate logs into 5m buckets and is idempotent', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const now = ctx.now()
      const currentStart = Math.floor(now / FIVE_MIN) * FIVE_MIN
      const prevStart = currentStart - FIVE_MIN
      // 上一个 5m 桶放 3 条,当前 5m 桶放 2 条。
      await insertOperateLogs(ctx, [prevStart, prevStart + 1000, prevStart + 2000])
      await insertOperateLogs(ctx, [currentStart, currentStart + 1000])

      await rollupSystemMetrics(ctx)
      await rollupSystemMetrics(ctx) // 重复执行结果一致,不翻倍

      const points = await queryMetricSeries(ctx, {
        end: currentStart + FIVE_MIN,
        grain: '5m',
        metricKey: OPERATE_COUNT_METRIC,
        namespace: SYSTEM_METRIC_NAMESPACE,
        ownerType: 'global',
        start: prevStart,
      })
      const byStart = new Map(points.map((p) => [p.bucketStart, p.value]))
      expect(byStart.get(prevStart)).toBe(3)
      expect(byStart.get(currentStart)).toBe(2)
    } finally {
      await cleanup()
    }
  })

  test('compact aggregates finished 5m buckets into an hour bucket', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const now = ctx.now()
      const currentHour = Math.floor(now / HOUR) * HOUR
      const targetHour = currentHour - HOUR // 已结束的上一小时,在 compact 的处理范围内

      // 该小时内放三个 5m 桶:2 + 5 + 3 = 10。
      await replaceMetricBuckets(ctx, [
        { bucketStart: targetHour, grain: '5m', metricKey: OPERATE_COUNT_METRIC, namespace: SYSTEM_METRIC_NAMESPACE, ownerType: 'global', value: 2 },
        { bucketStart: targetHour + FIVE_MIN, grain: '5m', metricKey: OPERATE_COUNT_METRIC, namespace: SYSTEM_METRIC_NAMESPACE, ownerType: 'global', value: 5 },
        { bucketStart: targetHour + 2 * FIVE_MIN, grain: '5m', metricKey: OPERATE_COUNT_METRIC, namespace: SYSTEM_METRIC_NAMESPACE, ownerType: 'global', value: 3 },
      ])

      await compactSystemMetrics(ctx)
      await compactSystemMetrics(ctx) // 重复执行结果一致

      const hourPoints = await queryMetricSeries(ctx, {
        end: targetHour + HOUR,
        grain: 'hour',
        metricKey: OPERATE_COUNT_METRIC,
        namespace: SYSTEM_METRIC_NAMESPACE,
        ownerType: 'global',
        start: targetHour,
      })
      expect(hourPoints.map((p) => p.value)).toEqual([10])
    } finally {
      await cleanup()
    }
  })

  test('compact deletes 5m buckets older than 48 hours', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const now = ctx.now()
      const oldStart = Math.floor(now / FIVE_MIN) * FIVE_MIN - 49 * HOUR
      await replaceMetricBuckets(ctx, [
        { bucketStart: oldStart, grain: '5m', metricKey: OPERATE_COUNT_METRIC, namespace: SYSTEM_METRIC_NAMESPACE, ownerType: 'global', value: 9 },
      ])

      await compactSystemMetrics(ctx)

      const remaining = await queryMetricSeries(ctx, {
        end: oldStart + FIVE_MIN,
        grain: '5m',
        metricKey: OPERATE_COUNT_METRIC,
        namespace: SYSTEM_METRIC_NAMESPACE,
        ownerType: 'global',
        start: oldStart,
      })
      expect(remaining).toHaveLength(0)
    } finally {
      await cleanup()
    }
  })
})

async function insertOperateLogs(
  ctx: Awaited<ReturnType<typeof createTestServiceContext>>['ctx'],
  createdAtList: number[],
): Promise<void> {
  for (const createdAt of createdAtList) {
    await ctx.db.execute(
      'INSERT INTO sys_operate_log (log_type, log_msg, status, created_at) VALUES (?, ?, ?, ?)',
      ['unknown', 'metric', 'success', createdAt],
    )
  }
}
