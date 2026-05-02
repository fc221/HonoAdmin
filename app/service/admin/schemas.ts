import { z } from 'zod'

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const configTypeSchema = z.enum(['site', 'system'])

export const configRecordSchema = z.object({
  configKey: z.string(),
  configType: configTypeSchema,
  configValue: z.string(),
  createdAt: z.string(),
  id: z.number().int().positive(),
  updatedAt: z.string(),
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

export const userRecordSchema = z.object({
  avatar: z.string().nullable(),
  createdAt: z.string(),
  id: z.number().int().positive(),
  isRoot: z.boolean(),
  nickname: z.string().nullable(),
  updatedAt: z.string(),
  username: z.string(),
})

export const createUserSchema = z.object({
  avatar: z.string().trim().max(500).nullable().optional(),
  isRoot: z.boolean().default(false),
  nickname: z.string().trim().max(80).nullable().optional(),
  password: z.string().min(6).max(128),
  username: z.string().trim().min(3).max(40).regex(/^[\w.-]+$/),
})

export const updateUserSchema = z.object({
  avatar: z.string().trim().max(500).nullable().optional(),
  isRoot: z.boolean().optional(),
  nickname: z.string().trim().max(80).nullable().optional(),
  password: z.string().min(6).max(128).optional(),
  username: z.string().trim().min(3).max(40).regex(/^[\w.-]+$/).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one user field is required.',
})

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
    message: z.string(),
  }),
  ok: z.literal(false),
})

export const configListResponseSchema = z.object({
  data: z.array(configRecordSchema),
  ok: z.literal(true),
})

export const configResponseSchema = z.object({
  data: configRecordSchema,
  ok: z.literal(true),
})

export const userListResponseSchema = z.object({
  data: z.array(userRecordSchema),
  ok: z.literal(true),
})

export const userResponseSchema = z.object({
  data: userRecordSchema,
  ok: z.literal(true),
})

export const deletedResponseSchema = z.object({
  ok: z.literal(true),
})

export type ConfigRecord = z.infer<typeof configRecordSchema>
export type CreateConfigInput = z.infer<typeof createConfigSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserRecord = z.infer<typeof userRecordSchema>
