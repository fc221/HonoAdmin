import type { BaseEntity } from '.'

export type ConfigType = 'site' | 'system'

export type ConfigEntity = BaseEntity & {
  config_key: string
  config_type: ConfigType
  config_value: string
}
