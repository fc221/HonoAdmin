import { z } from 'zod'

export const profilePasswordInputSchema = z.object({
  confirmPassword: z.string().min(1),
  oldPassword: z.string().min(1),
  password: z.string().min(6).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: '两次输入的新密码不一致。',
  path: ['confirmPassword'],
})

export type ProfilePasswordInput = z.infer<typeof profilePasswordInputSchema>
