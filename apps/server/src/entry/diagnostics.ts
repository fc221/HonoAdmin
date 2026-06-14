/**
 * 运行时自检:周期性把内存 / 在飞请求数打到 stderr,用于定位「跑久了卡死」。
 *
 * 怎么判读趋势:
 *  - rss / external / arrayBuffers 单调上涨 → 原生内存泄漏(优先怀疑 compress 的 CompressionStream)
 *  - pending(在飞请求)单调上涨而内存平稳 → 事件循环被阻塞(优先怀疑 logger 写满 stdout 管道)
 *
 * 刻意走 stderr:即使 stdout 被写满阻塞(假设 ②),这里仍能正常打出,反而能证实它。
 * 用环境变量 RUNTIME_STATS_INTERVAL_MS 控制间隔(毫秒),设 0 关闭;默认 60000。
 */
interface DiagnosticsServer {
  pendingRequests?: number
  pendingWebSockets?: number
}

const DEFAULT_INTERVAL_MS = 60_000

export function startRuntimeDiagnostics(server: DiagnosticsServer): () => void {
  const interval = Number(process.env.RUNTIME_STATS_INTERVAL_MS ?? DEFAULT_INTERVAL_MS)
  if (!Number.isFinite(interval) || interval <= 0) {
    return () => {}
  }

  const startedAt = Date.now()
  const timer = setInterval(() => {
    const mem = process.memoryUsage()
    const toMb = (bytes: number): number => Math.round(bytes / 1024 / 1024)

    console.error(
      `[runtime-stats] uptime=${Math.round((Date.now() - startedAt) / 1000)}s`
      + ` rss=${toMb(mem.rss)}MB`
      + ` heap=${toMb(mem.heapUsed)}/${toMb(mem.heapTotal)}MB`
      + ` external=${toMb(mem.external)}MB`
      + ` arrayBuffers=${toMb(mem.arrayBuffers)}MB`
      + ` pending=${server.pendingRequests ?? -1}`
      + ` ws=${server.pendingWebSockets ?? -1}`,
    )
  }, interval)

  if (timer && typeof timer === 'object' && 'unref' in timer) {
    timer.unref()
  }

  return () => clearInterval(timer)
}
