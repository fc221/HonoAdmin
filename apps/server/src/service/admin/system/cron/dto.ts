import { z } from 'zod'
import { paginationSchema } from '../../../common/pagination'

export const scheduledJobStatuses = ['active', 'inactive'] as const
export type ScheduledJobStatus = (typeof scheduledJobStatuses)[number]

export const listScheduledJobSchema = paginationSchema.extend({
  keyword: z.string().optional(),
})
export type ListScheduledJobInput = z.infer<typeof listScheduledJobSchema>

/** 新增/编辑共用。params 是表单里的逗号分隔字符串,存库时转 JSON 数组。 */
export const upsertScheduledJobSchema = z.object({
  description: z.string().trim().max(500).optional(),
  expression: z.string().trim().min(1, 'cron 表达式不能为空').max(120),
  handlerKey: z.string().trim().min(1, '请选择任务处理器').max(190),
  name: z.string().trim().min(1, '任务名称不能为空').max(190),
  params: z.string().trim().max(500).optional(),
  status: z.enum(scheduledJobStatuses).default('active'),
})
export type UpsertScheduledJobInput = z.infer<typeof upsertScheduledJobSchema>
