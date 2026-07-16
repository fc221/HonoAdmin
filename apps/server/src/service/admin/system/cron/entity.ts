/** sys_scheduled_job 行(snake_case,贴数据库)。 */
export interface ScheduledJobEntity {
  id: number
  name: string
  description: string | null
  expression: string
  handler_key: string
  params: string | null
  status: string
  is_running: number
  run_started_at: number | null
  last_run_at: number | null
  next_run_at: number | null
  last_result: string | null
  last_status: string | null
  last_duration_ms: number | null
  created_at: number
  updated_at: number
}

/**
 * 列表/对外记录(camelCase)。以 *At 结尾的数值字段会被资源层自动格式化为本地时间。
 * 用 type(而非 interface):闭合类型才能赋给资源层要求的 Record<string, unknown>。
 */
export type ScheduledJobRecord = {
  id: number
  name: string
  description: string | null
  expression: string
  handlerKey: string
  params: string | null
  status: string
  isRunning: boolean
  lastResult: string | null
  lastStatus: string | null
  lastDurationMs: number | null
  lastRunAt: number | null
  nextRunAt: number | null
  createdAt: number
  updatedAt: number
}

export function toScheduledJobRecord(row: ScheduledJobEntity): ScheduledJobRecord {
  return {
    createdAt: row.created_at,
    description: row.description,
    expression: row.expression,
    handlerKey: row.handler_key,
    id: row.id,
    isRunning: row.is_running === 1,
    lastDurationMs: row.last_duration_ms,
    lastResult: row.last_result,
    lastRunAt: row.last_run_at,
    lastStatus: row.last_status,
    name: row.name,
    nextRunAt: row.next_run_at,
    params: row.params,
    status: row.status,
    updatedAt: row.updated_at,
  }
}

/** SELECT 列清单,与 ScheduledJobEntity 字段一一对应。 */
export const scheduledJobColumns = `
  id,
  name,
  description,
  expression,
  handler_key,
  params,
  status,
  is_running,
  run_started_at,
  last_run_at,
  next_run_at,
  last_result,
  last_status,
  last_duration_ms,
  created_at,
  updated_at
`

export function serializeParams(params: string | undefined): string | null {
  const list = splitParams(params)
  return list.length ? JSON.stringify(list) : null
}

function splitParams(params: string | undefined): string[] {
  if (!params) {
    return []
  }
  return params
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function parseParams(raw: string | null): string[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return splitParams(raw)
  }
}
