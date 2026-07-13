import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import type { ResourceField } from '../../../schema'
import type { ResourceDefinition } from '../../../shared/resource'
import { listRoleOptions } from '../../../../service/admin/system/role'
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from '../../../../service/admin/system/user'
import { createUserSchema, updateUserSchema } from '../../../../service/admin/system/user/dto'
import { userGenderOptions, userStatusOptions } from '../../../../service/admin/system/user/enum'
import {
  createAction,
  deleteAction,
  editAction,
} from '../../../shared/resource'
import { buildResourceApp } from '../../../shared/resource-routes'

const userResource: ResourceDefinition = {
  actions: [createAction],
  columns: [
    ['id', 'ID'],
    ['username', '用户名'],
    ['nickname', '昵称'],
    ['status', '状态'],
    ['updatedAt', '更新时间'],
  ],
  // 角色名不单独占列,带给前端在 ID 单元格里渲染成 tag。
  extraRowKeys: ['roleNames'],
  create: (c, input) => createUser(c, createUserSchema.parse(normalizeUserInput(input, 'create'))),
  createFields: userCreateFields,
  delete: deleteUser,
  editFields: userEditFields,
  get: getUserById,
  list: listUserRows,
  rowActions: [editAction, deleteAction],
  title: '用户管理',
  update: (c, id, input) => updateUser(c, id, updateUserSchema.parse(normalizeUserInput(input, 'update'))),
}

// 列表额外带出角色名(供前端渲染角色 tag),并支持按 roleId 过滤。角色名走 role catalog 缓存,不额外打库。
async function listUserRows(c: Context<AppEnv>) {
  const result = await listUsers(c, {
    keyword: c.req.query('keyword') ?? '',
    page: Number(c.req.query('page') ?? 1),
    pageSize: Number(c.req.query('pageSize') ?? 10),
    roleId: c.req.query('roleId') || undefined,
  })
  const roleNameById = new Map(
    (await listRoleOptions(c).catch(() => [])).map((role) => [role.id, role.name]),
  )

  return {
    ...result,
    items: result.items.map((user) => ({
      ...user,
      roleNames: user.roleIds.map((id) => roleNameById.get(id) ?? `#${id}`),
    })),
  }
}

async function userCreateFields(c: Context<AppEnv>): Promise<ResourceField[]> {
  return [...await userBaseFields(c), { key: 'password', label: '密码', required: true, type: 'password' }]
}

async function userEditFields(c: Context<AppEnv>): Promise<ResourceField[]> {
  return [...await userBaseFields(c), { help: '留空则不修改密码。', key: 'password', label: '密码', type: 'password' }]
}

async function userBaseFields(c: Context<AppEnv>): Promise<ResourceField[]> {
  const roles = await listRoleOptions(c).catch(() => [])
  return [
    { key: 'username', label: '用户名', required: true, type: 'text' },
    { key: 'nickname', label: '昵称', type: 'text' },
    { key: 'roleIds', label: '角色', multiple: true, options: roles.map((role) => ({ label: role.name, value: role.id })), type: 'select' },
    { key: 'mail', label: '邮箱', type: 'text' },
    { key: 'phone', label: '手机', type: 'text' },
    { key: 'gender', label: '性别', options: userGenderOptions, type: 'select' },
    { key: 'status', label: '状态', options: userStatusOptions, required: true, type: 'select' },
    { key: 'bio', label: '简介', type: 'textarea' },
  ]
}

const adminUserApi = buildResourceApp(userResource, { tag: 'admin' })

export default adminUserApi

function normalizeUserInput(
  input: Record<string, unknown>,
  mode: 'create' | 'update',
): Record<string, unknown> {
  const normalized = { ...input }

  for (const key of ['avatar', 'bio', 'gender', 'mail', 'nickname', 'phone']) {
    if (normalized[key] === '') {
      normalized[key] = null
    }
  }

  if (mode === 'update' && normalized.password === '') {
    delete normalized.password
  }

  return normalized
}
