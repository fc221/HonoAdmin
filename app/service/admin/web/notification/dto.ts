import { z } from 'zod'
import { paginationSchema } from '../../../common/pagination'

export const notificationAliasSchema = z.string()
  .trim()
  .min(1, '请输入公告别名。')
  .max(255, '公告别名不能超过 255 个字符。')
  .regex(/^[\w.-]+$/, '公告别名只能包含字母、数字、下划线、点和横线。')

export const webNotificationRecordSchema = z.object({
  alias: z.string(),
  content: z.string(),
  created_at: z.string(),
  id: z.number().int().positive(),
  is_important: z.number().int(),
  is_top: z.number().int(),
  title: z.string(),
  updated_at: z.string(),
})

export const createWebNotificationSchema = z.object({
  alias: notificationAliasSchema,
  content: z.string().trim().min(1, '请输入公告内容。'),
  isImportant: z.boolean().default(false),
  isTop: z.boolean().default(false),
  title: z.string()
    .trim()
    .min(1, '请输入公告标题。')
    .max(255, '公告标题不能超过 255 个字符。'),
})

export const updateWebNotificationSchema
  = createWebNotificationSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'At least one notification field is required.' },
  )

export type CreateWebNotificationInput = z.infer<typeof createWebNotificationSchema>
export const listWebNotificationSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
})

export type ListWebNotificationInput = z.input<typeof listWebNotificationSchema>
export type UpdateWebNotificationInput = z.infer<typeof updateWebNotificationSchema>
export type WebNotificationRecord = z.infer<typeof webNotificationRecordSchema>
