export const operateLogTypes = [
  'login',
  'logout',
  'operation',
  'deleteOne',
  'createOne',
  'updateOne',
  'empty',
  'unknown',
] as const

export const operateLogTypeLabels: Record<OperateLogType, string> = {
  createOne: '新增',
  deleteOne: '删除',
  empty: '清空',
  login: '登录',
  logout: '退出',
  operation: '操作',
  unknown: '未知',
  updateOne: '更新',
}

export const operateLogTypeOptions = operateLogTypes.map((value) => ({
  label: operateLogTypeLabels[value],
  value,
}))

export const operateLogStatuses = [
  'active',
  'inactive',
  'success',
  'error',
  'unknown',
] as const

export type OperateLogStatus = (typeof operateLogStatuses)[number]
export type OperateLogType = (typeof operateLogTypes)[number]
