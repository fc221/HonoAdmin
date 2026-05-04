import { z } from 'zod'

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
    message: z.string(),
  }),
  ok: z.literal(false),
})

export const deletedResponseSchema = z.object({
  ok: z.literal(true),
})
