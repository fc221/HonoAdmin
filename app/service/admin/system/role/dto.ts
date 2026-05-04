import { z } from 'zod'
import { paginationResultSchema, paginationSchema } from '../../../common'
import { permissionCodeSchema } from '../permission'

export const roleCodeSchema = z.string()
  .trim()
  .min(2, '角色编码至少需要 2 个字符。')
  .max(40, '角色编码不能超过 40 个字符。')
  .regex(/^[\w.-]+$/, '角色编码只能包含字母、数字、下划线、点和横线。')

export const roleMenuNameSchema = z.string()
  .trim()
  .min(1, '请选择菜单。')
  .max(120, '菜单标识不能超过 120 个字符。')
  .regex(/^[\w.-]+$/, '菜单标识格式不正确。')

export const rolePolicySchema = z.object({
  actionKey: z.string().trim().min(1).max(80).default('*'),
  methodPattern: z.enum(['*', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'], {
    error: '权限方法只能是 *、GET、POST、PUT、PATCH、DELETE。',
  }),
  pathPattern: z.string()
    .trim()
    .min(1, '权限路径不能为空。')
    .max(255, '权限路径不能超过 255 个字符。')
    .startsWith('/', '权限路径必须以 / 开头。'),
})

export const roleRecordSchema = z.object({
  code: roleCodeSchema,
  createdAt: z.string(),
  description: z.string().nullable(),
  id: z.number().int().positive(),
  menuNames: z.array(roleMenuNameSchema),
  name: z.string(),
  permissionCodes: z.array(permissionCodeSchema),
  policies: z.array(rolePolicySchema),
  updatedAt: z.string(),
})

export const roleOptionSchema = z.object({
  code: roleCodeSchema,
  id: z.number().int().positive(),
  name: z.string(),
})

export const createRoleSchema = z.object({
  code: roleCodeSchema,
  description: z.string().trim().max(255, '角色说明不能超过 255 个字符。').nullable().optional(),
  menuNames: z.array(roleMenuNameSchema).default([]),
  name: z.string()
    .trim()
    .min(2, '角色名称至少需要 2 个字符。')
    .max(60, '角色名称不能超过 60 个字符。'),
  permissionCodes: z.array(permissionCodeSchema).default([]),
})

export const updateRoleSchema = createRoleSchema

export const listRoleSchema = paginationSchema.extend({
  keyword: z.string().trim().default(''),
})

export const roleListResultSchema = paginationResultSchema.extend({
  items: z.array(roleRecordSchema),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type ListRoleInput = z.input<typeof listRoleSchema>
export type RoleOption = z.infer<typeof roleOptionSchema>
export type RolePolicyInput = z.infer<typeof rolePolicySchema>
export type RoleRecord = z.infer<typeof roleRecordSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
