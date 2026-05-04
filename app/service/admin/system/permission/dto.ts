import { z } from 'zod'

export const permissionCodeSchema = z.string()
  .trim()
  .min(1, '请选择操作权限。')
  .max(120, '操作权限编码不能超过 120 个字符。')
  .regex(/^[\w.-]+$/, '操作权限编码格式不正确。')

export const permissionRecordSchema = z.object({
  actionKey: z.string(),
  code: permissionCodeSchema,
  createdAt: z.string(),
  groupName: z.string(),
  id: z.number().int().positive(),
  methodPattern: z.string(),
  name: z.string(),
  pathPattern: z.string(),
  sortOrder: z.number().int().nonnegative(),
  updatedAt: z.string(),
})

export type PermissionRecord = z.infer<typeof permissionRecordSchema>
