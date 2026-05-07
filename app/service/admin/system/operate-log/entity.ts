import type { BaseEntity } from '../../../../infra/database/types'
import type { OperateLogStatus, OperateLogType } from './enum'

export interface OperateLogEntity extends Pick<BaseEntity, 'id' | 'created_at'> {
  action_key: string | null
  client_ip: string | null
  error_msg: string | null
  log_data: string | null
  log_msg: string | null
  log_type: OperateLogType | null
  method: string | null
  req_data: string | null
  request_method: string | null
  res_data: string | null
  status: OperateLogStatus
  user_id: number | null
}
