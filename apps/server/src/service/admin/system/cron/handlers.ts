import {
  compactSystemMetrics,
  rollupSystemMetrics,
} from '../../../system/statistics/system-collector'
import { purgeOperateLogs } from '../operate-log'
import { registerJobHandler } from './registry'

/**
 * 内置任务处理器。处理器只依赖 ServiceContext(db / cache / config / now),
 * 因此在 bun / node / Workers 三端行为一致。新增业务任务在此 registerJobHandler 即可。
 */

// 清理 N 天前的操作日志(params[0] = 保留天数,默认 30)。分批删除,避免一次删百万行独占写锁。
registerJobHandler('purge-operate-log', async (ctx, params) => {
  const days = Number(params[0])
  const retainDays = Number.isFinite(days) && days > 0 ? days : 30
  const purged = await purgeOperateLogs(ctx, retainDays)
  return `已清理 ${purged} 条 ${retainDays} 天前的操作日志`
})

// rollup 每 5 分钟重算 5m 与当前小时统计桶;compact 每小时从操作日志重算 hour 桶并清理过期 5m 桶。
registerJobHandler('rollup-system-metrics', (ctx) => rollupSystemMetrics(ctx))
registerJobHandler('compact-system-metrics', (ctx) => compactSystemMetrics(ctx))
