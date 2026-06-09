import { z } from 'zod'
import { configTypes } from './enum'

export const configTypeSchema = z.enum(configTypes)

export const configRecordSchema = z.object({
  configKey: z.string(),
  configType: configTypeSchema,
  configValue: z.string(),
  createdAt: z.number().int().nonnegative(),
  id: z.number().int().positive(),
  updatedAt: z.number().int().nonnegative(),
})

export const createConfigSchema = z.object({
  configKey: z.string().trim().min(1).max(80).regex(/^[\w.-]+$/),
  configType: configTypeSchema,
  configValue: z.string().max(4000),
})

export const updateConfigSchema = z.object({
  configKey: z.string().trim().min(1).max(80).regex(/^[\w.-]+$/).optional(),
  configType: configTypeSchema.optional(),
  configValue: z.string().max(4000).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one config field is required.',
})

export const configListResponseSchema = z.object({
  data: z.array(configRecordSchema),
  ok: z.literal(true),
})

export const configResponseSchema = z.object({
  data: configRecordSchema,
  ok: z.literal(true),
})

export const siteConfigSchema = z.object({
  description: z.string(),
  keywords: z.string(),
  subtitle: z.string(),
  title: z.string(),
})

export type ConfigRecord = z.infer<typeof configRecordSchema>
export type CreateConfigInput = z.infer<typeof createConfigSchema>
export type SiteConfig = z.infer<typeof siteConfigSchema>
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>
