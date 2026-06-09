import { z } from 'zod'
import { paginationResultSchema, paginationSchema } from '../../../common/pagination'
import { userGenders, UserStatus, userStatuses } from './enum'

export const userStatusSchema = z.enum(userStatuses)
export const userGenderSchema = z.enum(userGenders)

const nullableMailSchema = z.string()
  .trim()
  .check(z.email({ error: '请输入有效邮箱。' }))
  .max(255, '邮箱不能超过 255 个字符。')
  .nullable()
  .optional()
const nullablePhoneSchema = z.string()
  .trim()
  .max(30, '手机不能超过 30 个字符。')
  .nullable()
  .optional()

export const userRecordSchema = z.object({
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.number().int().nonnegative(),
  gender: userGenderSchema.nullable(),
  id: z.number().int().positive(),
  isRoot: z.boolean(),
  mail: z.string().nullable(),
  nickname: z.string().nullable(),
  phone: z.string().nullable(),
  roleId: z.number().int().positive().nullable(),
  roleIds: z.array(z.number().int().positive()),
  status: userStatusSchema,
  updatedAt: z.number().int().nonnegative(),
  username: z.string(),
})

export const createUserSchema = z.object({
  avatar: z.string().trim().max(500, '头像 URL 不能超过 500 个字符。').nullable().optional(),
  bio: z.string().trim().max(500, '简介不能超过 500 个字符。').nullable().optional(),
  gender: userGenderSchema.nullable().optional(),
  isRoot: z.boolean().default(false),
  mail: nullableMailSchema,
  nickname: z.string().trim().max(80, '昵称不能超过 80 个字符。').nullable().optional(),
  password: z.string()
    .min(6, '密码至少需要 6 个字符。')
    .max(128, '密码不能超过 128 个字符。'),
  phone: nullablePhoneSchema,
  roleId: z.number().int().positive('请选择有效角色。').nullable().optional(),
  roleIds: z.array(z.number().int().positive('请选择有效角色。')).optional(),
  status: userStatusSchema.default(UserStatus.NORMAL),
  username: z.string()
    .trim()
    .min(3, '用户名至少需要 3 个字符。')
    .max(40, '用户名不能超过 40 个字符。')
    .regex(/^[\w.-]+$/, '用户名只能包含字母、数字、下划线、点和横线。'),
})

export const updateUserSchema = z.object({
  avatar: z.string().trim().max(500, '头像 URL 不能超过 500 个字符。').nullable().optional(),
  bio: z.string().trim().max(500, '简介不能超过 500 个字符。').nullable().optional(),
  gender: userGenderSchema.nullable().optional(),
  isRoot: z.boolean().optional(),
  mail: nullableMailSchema,
  nickname: z.string().trim().max(80, '昵称不能超过 80 个字符。').nullable().optional(),
  password: z.string()
    .min(6, '密码至少需要 6 个字符。')
    .max(128, '密码不能超过 128 个字符。')
    .optional(),
  phone: nullablePhoneSchema,
  roleId: z.number().int().positive('请选择有效角色。').nullable().optional(),
  roleIds: z.array(z.number().int().positive('请选择有效角色。')).optional(),
  status: userStatusSchema.optional(),
  username: z.string()
    .trim()
    .min(3, '用户名至少需要 3 个字符。')
    .max(40, '用户名不能超过 40 个字符。')
    .regex(/^[\w.-]+$/, '用户名只能包含字母、数字、下划线、点和横线。')
    .optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one user field is required.',
})

export const listUserSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
})

export const userListResultSchema = paginationResultSchema.extend({
  items: z.array(userRecordSchema),
})

export const userListResponseSchema = z.object({
  data: userListResultSchema,
  ok: z.literal(true),
})

export const userResponseSchema = z.object({
  data: userRecordSchema,
  ok: z.literal(true),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type CreateUserResult = z.infer<typeof userRecordSchema>
export type ListUserInput = z.input<typeof listUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserRecord = z.infer<typeof userRecordSchema>

export interface UserSessionRole {
  code: string
  id: number
  name: string
}

export interface UserHeaderProfile {
  activeRoleId: number | null
  avatar: string | null
  id: number
  nickname: string | null
  roles: UserSessionRole[]
  username: string
}
