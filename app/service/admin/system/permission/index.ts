import type { ServiceContext } from '../../../types'
import type { PermissionRecord } from './dto'
import type { PermissionEntity } from './entity'

export * from './dto'
export * from './entity'

const permissionColumns = `
  id,
  code,
  name,
  group_name,
  method_pattern,
  path_pattern,
  action_key,
  sort_order,
  created_at,
  updated_at
`

export async function listPermissions(
  ctx: ServiceContext,
): Promise<PermissionRecord[]> {
  const rows = await ctx.db.query<PermissionEntity>(`
    SELECT ${permissionColumns}
    FROM sys_permission
    ORDER BY sort_order ASC, id ASC
  `)

  return rows.map(toPermissionRecord)
}

function toPermissionRecord(row: PermissionEntity): PermissionRecord {
  return {
    actionKey: row.action_key,
    code: row.code,
    createdAt: row.created_at,
    groupName: row.group_name,
    id: row.id,
    methodPattern: row.method_pattern,
    name: row.name,
    pathPattern: row.path_pattern,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  }
}
