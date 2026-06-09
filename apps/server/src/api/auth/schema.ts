import { z } from 'zod'

export const userRoleSchema = z.object({
  code: z.string(),
  id: z.number(),
  name: z.string(),
})

export const userProfileSchema = z.object({
  activeRoleId: z.number().nullable().optional(),
  avatar: z.string().nullable().optional(),
  id: z.number(),
  nickname: z.string().nullable().optional(),
  roles: z.array(userRoleSchema).default([]),
  username: z.string(),
})

export const loginInputSchema = z.object({
  password: z.string().min(1),
  remember: z.boolean().default(false),
  username: z.string().trim().min(1),
})

export const roleSwitchInputSchema = z.object({
  roleId: z.number().int().positive(),
})

export type LoginInput = z.infer<typeof loginInputSchema>
export type RoleSwitchInput = z.infer<typeof roleSwitchInputSchema>
export type UserProfile = z.infer<typeof userProfileSchema>
