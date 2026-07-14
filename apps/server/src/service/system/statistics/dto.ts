import { z } from 'zod'
import { metricGrains } from './entity'

// 查询必须提供明确、有界的时间范围;禁止无界扫描。
export const metricSeriesQuerySchema = z
  .object({
    dimensionId: z.string().optional(),
    dimensionType: z.string().optional(),
    end: z.number().int(),
    grain: z.enum(metricGrains),
    metricKey: z.string().min(1),
    namespace: z.string().min(1),
    ownerId: z.string().default(''),
    ownerType: z.string().default('global'),
    start: z.number().int(),
  })
  .refine((query) => query.end > query.start, {
    message: '统计查询必须提供有效的时间范围。',
    path: ['end'],
  })

export type MetricSeriesQuery = z.input<typeof metricSeriesQuerySchema>
