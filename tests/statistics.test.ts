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

  test('compact recomputes finished hour buckets from source and heals 5m gaps', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const now = ctx.now()
      const currentHour = Math.floor(now / HOUR) * HOUR
      const targetHour = currentHour - HOUR // 已结束的上一小时,在 compact 窗口内

      // 该小时放 4 条操作日志,但故意不写任何 5m 桶:模拟那段时间 rollup 中断、细粒度层有缺口。
      await insertOperateLogs(ctx, [
        targetHour,
        targetHour + FIVE_MIN,
        targetHour + 2 * FIVE_MIN,
        targetHour + 30 * 60 * 1000,
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
      // 即便没有 5m 桶,hour 桶也按 operate_log 精确重算 = 4。
      expect(hourPoints.map((p) => p.value)).toEqual([4])
    } finally {
      await cleanup()
    }
  })

  test('rollup also recomputes the current hour bucket from source', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const now = ctx.now()
      const currentHour = Math.floor(now / HOUR) * HOUR
      const currentFiveMin = Math.floor(now / FIVE_MIN) * FIVE_MIN
      // 当前 5m 桶内放 3 条,确保落在当前小时。
      await insertOperateLogs(ctx, [currentFiveMin, currentFiveMin + 1000, currentFiveMin + 2000])

      await rollupSystemMetrics(ctx)

      const hourPoints = await queryMetricSeries(ctx, {
        end: currentHour + HOUR,
        grain: 'hour',
        metricKey: OPERATE_COUNT_METRIC,
        namespace: SYSTEM_METRIC_NAMESPACE,
        ownerType: 'global',
        start: currentHour,
      })
      // 当前小时无需等 compact,rollup 已从源写入 = 3。
      expect(hourPoints.map((p) => p.value)).toEqual([3])
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
