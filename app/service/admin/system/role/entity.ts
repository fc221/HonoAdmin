import type { BaseEntity } from '../../../../infra/database/types'

export interface RoleEntity extends BaseEntity {
  code: string
  description: string | null
  name: string
}

export interface RoleMenuEntity extends BaseEntity {
  menu_name: string
  role_id: number
}

export interface RolePolicyEntity extends BaseEntity {
  action_key: string
  method_pattern: string
  path_pattern: string
  role_id: number
}

export interface RolePermissionEntity extends BaseEntity {
  permission_code: string
  role_id: number
}
