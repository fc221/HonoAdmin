import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import type { PermissionRecord } from '../../../../service/admin/system/permission/dto'
import type { ResourceField } from '../../../schema'
import type { ResourceDefinition } from '../../../shared/resource'
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
import { buildResourceApp } from '../../../shared/resource-routes'

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

const systemRoleApi = buildResourceApp(roleResource, { tag: 'admin' })

export default systemRoleApi

async function roleFields(c: Context<AppEnv>): Promise<ResourceField[]> {
  const permissions = await listPermissions(c).catch(() => [])
  return [
    { key: 'code', label: '角色编码', required: true, type: 'text' },
    { key: 'name', label: '角色名称', required: true, type: 'text' },
    { key: 'description', label: '说明', type: 'textarea' },
    { help: '勾选分组可一次性授权整组菜单', key: 'menuNames', label: '菜单权限', multiple: true, options: menuTreeOptions(), type: 'tree' },
    { help: '按功能模块分组,勾选分组即授权该模块全部接口', key: 'permissionCodes', label: '接口权限', multiple: true, options: permissionTreeOptions(permissions), type: 'tree' },
  ]
}

function menuTreeOptions() {
  return adminMenus.map((menu) =>
    menu.children?.length
      ? {
          children: menu.children.map((child) => ({ label: child.label, value: child.name })),
          label: menu.label,
          value: menu.name,
        }
      : { label: menu.label, value: menu.name },
  )
}

function permissionTreeOptions(permissions: PermissionRecord[]) {
  const groups = new Map<string, { label: string, value: string }[]>()
  for (const permission of permissions) {
    const items = groups.get(permission.groupName) ?? []
    items.push({ label: permission.name, value: permission.code })
    groups.set(permission.groupName, items)
  }

  return [...groups].map(([groupName, children]) => ({
    children,
    label: groupName,
    // 分组节点仅用于勾选,不会被提交(树选择只回传叶子节点)。
    value: `group:${groupName}`,
  }))
}
