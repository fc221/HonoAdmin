import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import type { ResourceField } from '../../../schema'
import type { ResourceDefinition } from '../../../shared/resource'
import { Hono } from 'hono'
import { adminMenus } from '../../../../service/admin/system/menu/consts'
import { listPermissions } from '../../../../service/admin/system/permission'
import {
  createRole,
  deleteRole,
  getRoleById,
  listPaginatedRoles,
  updateRole,
} from '../../../../service/admin/system/role'
import {
  createAction,
  deleteAction,
  editAction,
  listInput,
} from '../../../shared/resource'
import { registerResourceRoutes } from '../../../shared/resource-routes'

const roleResource: ResourceDefinition = {
  actions: [createAction],
  columns: [
    ['id', 'ID'],
    ['code', '编码'],
    ['name', '名称'],
    ['description', '说明'],
    ['updatedAt', '更新时间'],
  ],
  create: (c, input) => createRole(c, input as never),
  createFields: roleFields,
  delete: deleteRole,
  editFields: roleFields,
  get: getRoleById,
  list: (c) => listPaginatedRoles(c, listInput(c)),
  rowActions: [editAction, deleteAction],
  title: '角色管理',
  update: (c, id, input) => updateRole(c, id, input as never),
}

const systemRoleApi = new Hono<AppEnv>()

registerResourceRoutes(systemRoleApi, roleResource, { tag: 'admin' })

export default systemRoleApi

async function roleFields(c: Context<AppEnv>): Promise<ResourceField[]> {
  const permissions = await listPermissions(c).catch(() => [])
  return [
    { key: 'code', label: '角色编码', required: true, type: 'text' },
    { key: 'name', label: '角色名称', required: true, type: 'text' },
    { key: 'description', label: '说明', type: 'textarea' },
    { key: 'menuNames', label: '菜单权限', multiple: true, options: flattenMenuOptions(), type: 'select' },
    { key: 'permissionCodes', label: '接口权限', multiple: true, options: permissions.map((permission) => ({ label: permission.name, value: permission.code })), type: 'select' },
  ]
}

function flattenMenuOptions() {
  return adminMenus.flatMap((menu) =>
    menu.children?.length
      ? menu.children.map((child) => ({ label: `${menu.label} / ${child.label}`, value: child.name }))
      : [{ label: menu.label, value: menu.name }],
  )
}
