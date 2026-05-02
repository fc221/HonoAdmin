import { BaseEntity } from "./base"

export type ConfigType = 'site' | 'system'

export type ConfigEntity = BaseEntity & {
  config_type: ConfigType
  config_key: string
  config_value: string
}
