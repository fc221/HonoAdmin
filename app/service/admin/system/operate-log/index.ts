import type { PaginatedResult } from '../../../common'
import type { ServiceContext, ServiceRequestContext } from '../../../types'
import type {
  CreateOperateLogInput,
  ListOperateLogInput,
  OperateLogRecord,
} from './dto'
import type { OperateLogEntity } from './entity'
import { NotFoundError } from '../../../../utils'
import {
  buildKeywordCondition,
  buildWhereClause,
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common'
import { getAdminSessionUser } from '../../session'
import { listOperateLogSchema } from './dto'

export * from './dto'
export * from './entity'
export * from './enum'

const operateLogColumns = `
  id,
  user_id,
  log_type,
  log_msg,
  log_data,
  error_msg,
  action_key,
  method,
  request_method,
  req_data,
  res_data,
  client_ip,
  status,
  created_at
`

export async function listOperateLogs(
  ctx: ServiceContext,
  input: ListOperateLogInput = {},
): Promise<PaginatedResult<OperateLogRecord>> {
  const listInput = listOperateLogSchema.parse(input)
  const whereClause = buildWhereClause([
    listInput.logType
      ? { params: [listInput.logType], sql: 'log_type = ?' }
      : null,
    listInput.userId
      ? { params: [listInput.userId], sql: 'user_id = ?' }
      : null,
    buildKeywordCondition(listInput.keyword, [
      'status',
      'log_msg',
      'error_msg',
      'action_key',
      'method',
      'request_method',
      'client_ip',
    ]),
  ])
  const total = await countOperateLogs(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<OperateLogEntity>(`
    SELECT ${operateLogColumns}
    FROM sys_operate_log
    ${whereClause.sql}
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `, [
    ...whereClause.params,
    pagination.pageSize,
    getPaginationOffset(pagination),
  ])

  return createPaginatedResult(
    rows.map(toOperateLogRecord),
    total,
    pagination,
  )
}

export async function createOperateLog(
  ctx: ServiceContext,
  input: CreateOperateLogInput,
): Promise<void> {
  await ctx.db.execute(
    `
      INSERT INTO sys_operate_log (
        user_id,
        log_type,
        log_msg,
        log_data,
        error_msg,
        action_key,
        method,
        request_method,
        req_data,
        res_data,
        client_ip,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.userId ?? null,
      input.logType ?? null,
      input.logMsg ?? null,
      serializeLogValue(input.logData),
      input.errorMsg ?? null,
      input.actionKey ?? null,
      input.method ?? null,
      input.requestMethod ?? null,
      serializeLogValue(input.reqData),
      serializeLogValue(input.resData),
      input.clientIp ?? null,
      input.status ?? 'success',
      ctx.now(),
    ],
  )
}

export async function createRequestOperateLog(
  c: ServiceRequestContext,
  input: Omit<CreateOperateLogInput, 'clientIp' | 'requestMethod' | 'userId'> & {
    userId?: number | null
  },
): Promise<void> {
  const user = input.userId === undefined ? await getAdminSessionUser(c) : null

  await createOperateLog(c, {
    ...input,
    clientIp: getClientIp(c),
    requestMethod: c.req.method,
    userId: input.userId ?? user?.id ?? null,
  })
}

export async function deleteOperateLog(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const result = await ctx.db.execute(
    'DELETE FROM sys_operate_log WHERE id = ?',
    [id],
  )

  if (result.rowsAffected === 0) {
    throw new NotFoundError('操作日志不存在。', { id })
  }
}

export async function clearOperateLogs(ctx: ServiceContext): Promise<number> {
  const result = await ctx.db.execute('DELETE FROM sys_operate_log')
  return result.rowsAffected
}

async function countOperateLogs(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM sys_operate_log
      ${whereSql}
    `,
    params,
  )

  return row?.count ?? 0
}

function serializeLogValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value)
}

function getClientIp(c: ServiceRequestContext): string | null {
  return (
    c.req.header('cf-connecting-ip')
    ?? c.req.header('x-real-ip')
    ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    ?? null
  )
}

function toOperateLogRecord(row: OperateLogEntity): OperateLogRecord {
  return {
    actionKey: row.action_key,
    clientIp: row.client_ip,
    createdAt: row.created_at,
    errorMsg: row.error_msg,
    id: row.id,
    logData: row.log_data,
    logMsg: row.log_msg,
    logType: row.log_type,
    method: row.method,
    requestMethod: row.request_method,
    reqData: row.req_data,
    resData: row.res_data,
    status: row.status,
    userId: row.user_id,
  }
}
