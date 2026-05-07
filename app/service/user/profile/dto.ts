import { z } from 'zod'
import { operateLogTypes } from '../../admin/system/operate-log/enum'
import { updateUserSchema, userGenderSchema } from '../../admin/system/user/dto'
import { userGenders } from '../../admin/system/user/enum'
import { paginationSchema } from '../../common/pagination'

export const userProfileUpdateSchema = z.object({
  avatar: updateUserSchema.shape.avatar,
  bio: updateUserSchema.shape.bio,
  gender: z.preprocess(
    (value) =>
      userGenders.includes(value as (typeof userGenders)[number])
        ? value
        : null,
    userGenderSchema.nullable().optional(),
  ),
  nickname: updateUserSchema.shape.nickname,
  username: updateUserSchema.shape.username.unwrap(),
})

export const userPasswordUpdateSchema = z.object({
  confirmPassword: z.string().min(1, '请再次输入新密码。'),
  oldPassword: z.string().min(1, '请输入旧密码。'),
  password: z.string()
    .min(6, '密码至少需要 6 个字符。')
    .max(128, '密码不能超过 128 个字符。'),
}).refine((value) => value.password === value.confirmPassword, {
  message: '两次输入的新密码不一致。',
  path: ['confirmPassword'],
})

export const listUserProfileOperateLogSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
  logType: z.preprocess(
    (value) =>
      operateLogTypes.includes(value as (typeof operateLogTypes)[number])
        ? value
        : '',
    z.union([z.enum(operateLogTypes), z.literal('')]),
  ).default(''),
})

export type ListUserProfileOperateLogInput = z.input<
  typeof listUserProfileOperateLogSchema
>
export type UserPasswordUpdateInput = z.input<typeof userPasswordUpdateSchema>
export type UserProfileUpdateInput = z.input<typeof userProfileUpdateSchema>
