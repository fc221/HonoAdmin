import { z } from 'zod'

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
    message: z.string(),
  }),
  ok: z.literal(false),
})

export const apiOkResponseSchema = z.object({
  ok: z.literal(true),
})
