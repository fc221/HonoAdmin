import os from 'node:os'
import { readLocalSystemMetrics } from '@hono-admin/runtime/local-metrics'
import { describe, expect, test } from 'bun:test'

describe('local system metrics', () => {
  test('reports plausible cpu, memory and storage values', async () => {
    const metrics = await readLocalSystemMetrics()

    expect(metrics).not.toBeNull()
    if (!metrics) {
      return
    }

    expect(metrics.cpuCores).toBe(os.cpus().length)
    expect(metrics.cpuLoadPercent).toBeGreaterThanOrEqual(0)

    // 内存口径必须扣掉可回收缓存,不能是 total - freemem —— 那个在 macOS/Linux 上常年 90%+。
    expect(metrics.memoryTotal).toBeGreaterThan(0)
    expect(metrics.memoryUsed).toBeGreaterThan(0)
    expect(metrics.memoryUsed).toBeLessThanOrEqual(metrics.memoryTotal)
    expect(metrics.memoryUsedPercent).toBeLessThan(100)

    expect(metrics.storageTotal).toBeGreaterThan(0)
    expect(metrics.storageUsed).toBeLessThanOrEqual(metrics.storageTotal)
    expect(metrics.processMemory).toBeGreaterThan(0)
    expect(metrics.uptimeSeconds).toBeGreaterThan(0)
  })
})
