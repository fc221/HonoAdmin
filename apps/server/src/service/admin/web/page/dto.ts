import { z } from 'zod'
import { createAliasSchema } from '../../../common/alias'
import { paginationSchema } from '../../../common/pagination'

export const pageAliasSchema = createAliasSchema('页面别名')

export const webPageRecordSchema = z.object({
  alias: z.string(),
  category: z.string().nullable(),
  content: z.string(),
  createdAt: z.number().int().nonnegative(),
  id: z.number().int().positive(),
  summary: z.string().nullable(),
  title: z.string(),
  updatedAt: z.number().int().nonnegative(),
})

export const createWebPageSchema = z.object({
  alias: pageAliasSchema,
  category: z.string()
    .trim()
    .max(80, '分类不能超过 80 个字符。')
    .nullable()
    .optional(),
  content: z.string().trim().min(1, '请输入页面内容。'),
  summary: z.string()
    .trim()
    .max(500, '摘要不能超过 500 个字符。')
    .nullable()
    .optional(),
  title: z.string()
    .trim()
    .min(1, '请输入页面标题。')
    .max(255, '页面标题不能超过 255 个字符。'),
})

export const updateWebPageSchema = createWebPageSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one page field is required.' },
)

export const listWebPageSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
})

export type CreateWebPageInput = z.infer<typeof createWebPageSchema>
export type ListWebPageInput = z.input<typeof listWebPageSchema>
export type UpdateWebPageInput = z.infer<typeof updateWebPageSchema>
export type WebPageRecord = z.infer<typeof webPageRecordSchema>
