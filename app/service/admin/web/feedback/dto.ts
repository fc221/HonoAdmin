import { z } from 'zod'
import { paginationSchema } from '../../../common'
import { webFeedbackStatuses } from './enum'

export const webFeedbackStatusSchema = z.enum(webFeedbackStatuses)

export const webFeedbackRecordSchema = z.object({
  contact: z.string().nullable(),
  content: z.string(),
  created_at: z.string(),
  id: z.number().int().positive(),
  images: z.string().nullable(),
  reply: z.string().nullable(),
  status: webFeedbackStatusSchema,
  title: z.string(),
  updated_at: z.string(),
  user_id: z.number().int().positive().nullable(),
})

export const createWebFeedbackSchema = z.object({
  contact: z.string().trim().max(255).nullable().optional(),
  content: z.string().trim().min(1),
  images: z.array(z.string().trim().min(1)).max(3).default([]),
  title: z.string().trim().min(1).max(255),
  userId: z.number().int().positive().nullable().optional(),
})

export const updateWebFeedbackSchema = z.object({
  reply: z.string().trim().max(4000).nullable().optional(),
  status: webFeedbackStatusSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one feedback field is required.',
})

export type CreateWebFeedbackInput = z.infer<typeof createWebFeedbackSchema>
export const listWebFeedbackSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
})

export type ListWebFeedbackInput = z.input<typeof listWebFeedbackSchema>
export type UpdateWebFeedbackInput = z.infer<typeof updateWebFeedbackSchema>
export type WebFeedbackRecord = z.infer<typeof webFeedbackRecordSchema>
