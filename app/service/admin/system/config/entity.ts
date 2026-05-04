import type { BaseEntity } from '../../../../infra/database'
import type { ConfigType } from './enum'

export interface ConfigEntity extends BaseEntity {
  config_key: string
  config_type: ConfigType
  config_value: string
}
