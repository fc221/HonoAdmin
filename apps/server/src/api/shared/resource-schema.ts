import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export const resourceRowSchema = z.record(z.string(), z.unknown())

export const resourceQuerySchema = z.object({
  keyword: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  uploadType: z.string().optional(),
})

export const resourceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const resourceBodySchema = z.record(z.string(), z.unknown())

export const resourceColumnSchema = z.object({
  key: z.string(),
  title: z.string(),
  width: z.number().optional(),
})

export const resourceFieldOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
})

export const resourceFieldSchema = z.object({
  defaultValue: z.unknown().optional(),
  help: z.string().optional(),
  key: z.string(),
  label: z.string(),
  multiple: z.boolean().optional(),
  options: z.array(resourceFieldOptionSchema).optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  type: z.enum([
    'text',
    'password',
    'textarea',
    'select',
    'switch',
    'number',
    'richtext',
    'upload',
    'readonly',
  ]),
})

export const resourceActionSchema = z.object({
  danger: z.boolean().optional(),
  key: z.enum(['create', 'edit', 'delete', 'clear', 'upload', 'run']),
  label: z.string(),
})

export const resourceListSchema = z.object({
  actions: z.array(resourceActionSchema).default([]),
  columns: z.array(resourceColumnSchema),
  createFields: z.array(resourceFieldSchema).default([]),
  editFields: z.array(resourceFieldSchema).default([]),
  pagination: paginationSchema,
  rows: z.array(resourceRowSchema),
  rowActions: z.array(resourceActionSchema).default([]),
  title: z.string(),
})

export const resourceDetailSchema = z.object({
  data: resourceRowSchema,
  fields: z.array(resourceFieldSchema),
  title: z.string(),
})

export const resourceMutationSchema = z.object({
  data: resourceRowSchema.nullable().optional(),
  message: z.string(),
  ok: z.boolean(),
})

export type ResourceAction = z.infer<typeof resourceActionSchema>
export type ResourceDetail = z.infer<typeof resourceDetailSchema>
export type ResourceField = z.infer<typeof resourceFieldSchema>
export type ResourceList = z.infer<typeof resourceListSchema>
export type ResourceMutation = z.infer<typeof resourceMutationSchema>
