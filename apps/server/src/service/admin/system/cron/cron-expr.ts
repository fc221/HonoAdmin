import { Cron } from 'croner'

/** 校验 cron 表达式是否合法(语法层面,不绑定时区)。 */
export function isValidCronExpression(expression: string): boolean {
  try {
    // 仅构造 pattern 做校验,不传 callback 不会真正调度。
    const cron = new Cron(expression)
    cron.stop()
    return true
  } catch {
    return false
  }
}

/**
 * 按给定时区计算 fromMs 之后的下一次执行时间(毫秒)。
 * 三端共用:本地心跳与 Workers scheduled 都靠它回写 next_run_at。
 * 表达式非法或时区不被支持时返回 null。
 */
export function computeNextRunAt(
  expression: string,
  timezone: string,
  fromMs: number,
): number | null {
  try {
    const cron = new Cron(expression, { timezone })
    const next = cron.nextRun(new Date(fromMs))
    cron.stop()
    return next ? next.getTime() : null
  } catch {
    return null
  }
}
