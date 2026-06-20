import type { AppRuntime } from '@hono-admin/runtime'
import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type { ListScheduledJobInput } from './dto'
import type { ScheduledJobEntity, ScheduledJobRecord } from './entity'
import { Cron } from 'croner'
import { NotFoundError, ValidationError } from '../../../../utils/errors'
import {
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common/pagination'
import { buildKeywordCondition, buildWhereClause } from '../../../common/query'
import { computeNextRunAt, isValidCronExpression } from './cron-expr'
import { listScheduledJobSchema, upsertScheduledJobSchema } from './dto'
import { toScheduledJobRecord } from './entity'
import { getJobHandler, hasJobHandler } from './registry'
// 副作用导入:确保内置处理器在任意运行时(请求 / 心跳 / Workers)都已注册。
import './handlers'

/** 抢占锁超时:执行进程崩溃后,超过这个时长其它心跳可重新认领,避免 is_running 永久卡住。 */
const LOCK_TIMEOUT_MS = 5 * 60 * 1000
const MAX_RESULT_LENGTH = 2000

const scheduledJobColumns = `
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

/** 心跳:列出所有到点(next_run_at 已到或为空)的启用任务。 */
export async function listDueScheduledJobs(
  ctx: ServiceContext,
  now: number,
): Promise<ScheduledJobEntity[]> {
  return ctx.db.query<ScheduledJobEntity>(
    `
      SELECT ${scheduledJobColumns}
      FROM sys_scheduled_job
      WHERE status = 'active'
        AND (next_run_at IS NULL OR next_run_at <= ?)
      ORDER BY next_run_at ASC, id ASC
    `,
    [now],
  )
}

// ── 运行时驱动(非请求路径)──────────────────────────────────────────────
// bun/node:进程内每分钟心跳;Workers:scheduled() 调 runSchedulerTick()。
// 都不经过 HTTP,直接用运行时的 db/cache/config 构造 ServiceContext。

let localScheduler: Cron | null = null

/** 从运行时构造一个非请求的 ServiceContext。 */
export function contextFromRuntime(runtime: AppRuntime): ServiceContext {
  return {
    cache: runtime.cache,
    config: runtime.config,
    db: runtime.db,
    now: () => Date.now(),
    runtime,
  }
}

/** 跑一轮调度:认领并执行所有到点任务。表未就绪(未安装/未迁移)时静默跳过。 */
export async function runSchedulerTick(runtime: AppRuntime): Promise<void> {
  const ctx = contextFromRuntime(runtime)
  let due: ScheduledJobEntity[]
  try {
    due = await listDueScheduledJobs(ctx, ctx.now())
  } catch {
    return
  }

  for (const job of due) {
    try {
      await executeScheduledJob(ctx, job)
    } catch (error) {
      console.error(`[scheduler] 任务 ${job.name} 执行异常:`, error)
    }
  }
}

/** 启动 bun/node 进程内心跳(每分钟一次,按应用时区,protect 防单进程内重叠)。 */
export function startLocalScheduler(runtime: AppRuntime): void {
  if (localScheduler) {
    return
  }

  const { timezone } = runtime.config
  localScheduler = new Cron('* * * * *', { protect: true, timezone }, () => {
    void runSchedulerTick(runtime)
  })
  // 启动即跑一轮,避免重启后要等到下一分钟边界。
  void runSchedulerTick(runtime)
  console.log(`[scheduler] 本地心跳已启动(每分钟,时区 ${timezone})`)
}

/**
 * 抢占 → 执行处理器 → 回写结果。抢占用条件 UPDATE 实现,跨进程/跨实例只会有一个赢家,
 * 因此 bun/node 多实例与 Workers 多次触发都不会重复执行。
 */
export async function executeScheduledJob(
  ctx: ServiceContext,
  job: ScheduledJobEntity,
): Promise<{ result: string, status: 'success' | 'error' | 'skipped' }> {
  const claimed = await claimScheduledJob(ctx, job.id)
  if (!claimed) {
    return { result: '', status: 'skipped' }
  }

  const start = ctx.now()
  const handler = getJobHandler(job.handler_key)
  let status: 'success' | 'error' = 'success'
  let result = ''

  if (!handler) {
    status = 'error'
    result = `未注册的任务处理器:${job.handler_key}`
  } else {
    try {
      result = stringifyResult(await handler(ctx, parseParams(job.params)))
    } catch (error) {
      status = 'error'
      result = error instanceof Error ? error.message : String(error)
    }
  }

  const end = ctx.now()
  await finishScheduledJob(ctx, job.id, {
    lastDurationMs: end - start,
    lastResult: result.slice(0, MAX_RESULT_LENGTH),
    lastRunAt: start,
    lastStatus: status,
    nextRunAt: computeNextRunAt(job.expression, ctx.config.timezone, end),
  })

  return { result, status }
}

async function claimScheduledJob(
  ctx: ServiceContext,
  id: number,
): Promise<boolean> {
  const now = ctx.now()
  const result = await ctx.db.execute(
    `
      UPDATE sys_scheduled_job
      SET is_running = 1, run_started_at = ?, updated_at = ?
      WHERE id = ?
        AND status = 'active'
        AND (is_running = 0 OR run_started_at IS NULL OR run_started_at < ?)
    `,
    [now, now, id, now - LOCK_TIMEOUT_MS],
  )

  return result.rowsAffected === 1
}

async function finishScheduledJob(
  ctx: ServiceContext,
  id: number,
  fields: {
    lastDurationMs: number
    lastResult: string
    lastRunAt: number
    lastStatus: 'success' | 'error'
    nextRunAt: number | null
  },
): Promise<void> {
  await ctx.db.execute(
    `
      UPDATE sys_scheduled_job
      SET is_running = 0, run_started_at = NULL,
          last_run_at = ?, next_run_at = ?, last_result = ?,
          last_status = ?, last_duration_ms = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      fields.lastRunAt,
      fields.nextRunAt,
      fields.lastResult,
      fields.lastStatus,
      fields.lastDurationMs,
      ctx.now(),
      id,
    ],
  )
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

function serializeParams(params: string | undefined): string | null {
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

function parseParams(raw: string | null): string[] {
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

function stringifyResult(value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
