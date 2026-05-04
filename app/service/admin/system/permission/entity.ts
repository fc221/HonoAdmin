import type { BaseEntity } from '../../../../infra/database'

export interface PermissionEntity extends BaseEntity {
  action_key: string
  code: string
  group_name: string
  method_pattern: string
  name: string
  path_pattern: string
  sort_order: number
}
