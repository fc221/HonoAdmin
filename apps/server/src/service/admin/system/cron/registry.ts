import type { ServiceContext } from '../../../types'

/**
 * 任务处理器:在请求外(心跳 / Workers scheduled)或请求内(手动执行)都用同一签名调用。
 * ctx 是从当前运行时构造的 ServiceContext,处理器据此拿到 db / cache / config / now。
 */
export type JobHandler = (
  ctx: ServiceContext,
  params: string[],
) => Promise<unknown> | unknown

const handlers = new Map<string, JobHandler>()

/** 注册一个任务处理器。重复 key 以最后一次为准(模块级单例,各运行时一致)。 */
export function registerJobHandler(key: string, handler: JobHandler): void {
  handlers.set(key, handler)
}

export function getJobHandler(key: string): JobHandler | undefined {
  return handlers.get(key)
}

export function hasJobHandler(key: string): boolean {
  return handlers.has(key)
}

/** 后台新增/编辑表单的处理器下拉来源。 */
export function listJobHandlerKeys(): string[] {
  return [...handlers.keys()].sort()
}
