import type { AppRuntime } from '@hono-admin/runtime'
import type { ServiceContext } from '../../../types'
import type { ScheduledJobEntity } from './entity'
import { Cron } from 'croner'
import { computeNextRunAt } from './cron-expr'
import { parseParams, scheduledJobColumns } from './entity'
import { getJobHandler } from './registry'

/** 抢占锁超时:执行进程崩溃后,超过这个时长其它心跳可重新认领,避免 is_running 永久卡住。 */
const LOCK_TIMEOUT_MS = 5 * 60 * 1000
const MAX_RESULT_LENGTH = 2000

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
