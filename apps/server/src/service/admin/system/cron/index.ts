import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type { ListScheduledJobInput } from './dto'
import type { ScheduledJobEntity, ScheduledJobRecord } from './entity'
import { NotFoundError, ValidationError } from '../../../../utils/errors'
import {
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common/pagination'
import { buildKeywordCondition, buildWhereClause } from '../../../common/query'
import { computeNextRunAt, isValidCronExpression } from './cron-expr'
import { listScheduledJobSchema, upsertScheduledJobSchema } from './dto'
import {
  parseParams,
  scheduledJobColumns,
  serializeParams,
  toScheduledJobRecord,
} from './entity'
import { hasJobHandler } from './registry'
import { executeScheduledJob } from './scheduler'
// 副作用导入:确保内置处理器在任意运行时(请求 / 心跳 / Workers)都已注册。
import './handlers'

// 运行时驱动与执行内部实现在 ./scheduler,导出路径保持不变。
export {
  contextFromRuntime,
  executeScheduledJob,
  listDueScheduledJobs,
  runSchedulerTick,
  startLocalScheduler,
} from './scheduler'

export interface ScheduledJobRunOutcome {
  message: string
  status: 'success' | 'error' | 'skipped'
}

export async function listScheduledJobs(
  ctx: ServiceContext,
  input: ListScheduledJobInput,
): Promise<PaginatedResult<ScheduledJobRecord>> {
  const listInput = listScheduledJobSchema.parse(input)
  const whereClause = buildWhereClause([
    buildKeywordCondition(listInput.keyword ?? '', [
      'name',
      'handler_key',
      'description',
    ]),
  ])
  const total = await countScheduledJobs(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<ScheduledJobEntity>(
    `
      SELECT ${scheduledJobColumns}
      FROM sys_scheduled_job
      ${whereClause.sql}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `,
    [...whereClause.params, pagination.pageSize, getPaginationOffset(pagination)],
  )

  return createPaginatedResult(rows.map(toScheduledJobRecord), total, pagination)
}

/** 编辑表单初始值:params 还原成逗号分隔字符串。 */
export async function getScheduledJobForEdit(
  ctx: ServiceContext,
  id: number,
): Promise<Record<string, unknown>> {
  const job = await requireScheduledJob(ctx, id)

  return {
    description: job.description ?? '',
    expression: job.expression,
    handlerKey: job.handler_key,
    name: job.name,
    params: parseParams(job.params).join(','),
    status: job.status,
  }
}

export async function createScheduledJob(
  ctx: ServiceContext,
  input: Record<string, unknown>,
): Promise<ScheduledJobRecord> {
  const data = upsertScheduledJobSchema.parse(input)
  assertHandlerRegistered(data.handlerKey)
  assertValidExpression(data.expression)
  await assertNameAvailable(ctx, data.name)

  const now = ctx.now()
  const nextRunAt = data.status === 'active'
    ? computeNextRunAt(data.expression, ctx.config.timezone, now)
    : null
  const id = await ctx.db.insertAndGetId(
    `
      INSERT INTO sys_scheduled_job (
        name, description, expression, handler_key, params,
        status, is_running, next_run_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `,
    [
      data.name,
      data.description ?? null,
      data.expression,
      data.handlerKey,
      serializeParams(data.params),
      data.status,
      nextRunAt,
      now,
      now,
    ],
  )

  return toScheduledJobRecord(await requireScheduledJob(ctx, id))
}

export async function updateScheduledJob(
  ctx: ServiceContext,
  id: number,
  input: Record<string, unknown>,
): Promise<ScheduledJobRecord> {
  await requireScheduledJob(ctx, id)
  const data = upsertScheduledJobSchema.parse(input)
  assertHandlerRegistered(data.handlerKey)
  assertValidExpression(data.expression)
  await assertNameAvailable(ctx, data.name, id)

  const now = ctx.now()
  const nextRunAt = data.status === 'active'
    ? computeNextRunAt(data.expression, ctx.config.timezone, now)
    : null
  await ctx.db.execute(
    `
      UPDATE sys_scheduled_job
      SET name = ?, description = ?, expression = ?, handler_key = ?, params = ?,
          status = ?, next_run_at = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      data.name,
      data.description ?? null,
      data.expression,
      data.handlerKey,
      serializeParams(data.params),
      data.status,
      nextRunAt,
      now,
      id,
    ],
  )

  return toScheduledJobRecord(await requireScheduledJob(ctx, id))
}

export async function deleteScheduledJob(
  ctx: ServiceContext,
  id: number,
): Promise<void> {
  const result = await ctx.db.execute(
    'DELETE FROM sys_scheduled_job WHERE id = ?',
    [id],
  )

  if (result.rowsAffected === 0) {
    throw new NotFoundError('定时任务不存在。', { id })
  }
}

/** 手动执行一次:在当前进程内直接调用处理器,不发任何 HTTP 请求。 */
export async function runScheduledJobById(
  ctx: ServiceContext,
  id: number,
): Promise<ScheduledJobRunOutcome> {
  const job = await requireScheduledJob(ctx, id)
  if (job.status !== 'active') {
    throw new ValidationError('任务已禁用,无法执行。', { id })
  }

  const outcome = await executeScheduledJob(ctx, job)
  if (outcome.status === 'skipped') {
    return { message: '任务正在执行中,请稍后再试。', status: 'skipped' }
  }
  if (outcome.status === 'error') {
    return { message: `执行失败:${outcome.result}`, status: 'error' }
  }
  return { message: '执行成功。', status: 'success' }
}

async function getScheduledJobEntity(
  ctx: ServiceContext,
  id: number,
): Promise<ScheduledJobEntity | null> {
  return ctx.db.first<ScheduledJobEntity>(
    `SELECT ${scheduledJobColumns} FROM sys_scheduled_job WHERE id = ?`,
    [id],
  )
}

async function requireScheduledJob(
  ctx: ServiceContext,
  id: number,
): Promise<ScheduledJobEntity> {
  const job = await getScheduledJobEntity(ctx, id)
  if (!job) {
    throw new NotFoundError('定时任务不存在。', { id })
  }
  return job
}

async function assertNameAvailable(
  ctx: ServiceContext,
  name: string,
  excludeId?: number,
): Promise<void> {
  const existing = await ctx.db.first<{ id: number }>(
    'SELECT id FROM sys_scheduled_job WHERE name = ?',
    [name],
  )
  if (existing && existing.id !== excludeId) {
    throw new ValidationError('任务名称已存在。', { name })
  }
}

function assertHandlerRegistered(handlerKey: string): void {
  if (!hasJobHandler(handlerKey)) {
    throw new ValidationError(`未注册的任务处理器:${handlerKey}`, { handlerKey })
  }
}

function assertValidExpression(expression: string): void {
  if (!isValidCronExpression(expression)) {
    throw new ValidationError('cron 表达式不合法。', { expression })
  }
}

async function countScheduledJobs(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sys_scheduled_job ${whereSql}`,
    params,
  )
  return row?.count ?? 0
}
