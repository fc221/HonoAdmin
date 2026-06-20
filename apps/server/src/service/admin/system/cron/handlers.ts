import { registerJobHandler } from './registry'

/**
 * 内置任务处理器。处理器只依赖 ServiceContext(db / cache / config / now),
 * 因此在 bun / node / Workers 三端行为一致。新增业务任务在此 registerJobHandler 即可。
 */

// 清理 N 天前的操作日志(params[0] = 保留天数,默认 30)。
registerJobHandler('purge-operate-log', async (ctx, params) => {
  const days = Number(params[0])
  const retainDays = Number.isFinite(days) && days > 0 ? days : 30
  const cutoff = ctx.now() - retainDays * 24 * 60 * 60 * 1000
  const result = await ctx.db.execute(
    'DELETE FROM sys_operate_log WHERE created_at < ?',
    [cutoff],
  )
  return `已清理 ${result.rowsAffected} 条 ${retainDays} 天前的操作日志`
})
