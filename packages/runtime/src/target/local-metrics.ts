import type { SystemMetrics } from '../types'
import os from 'node:os'
import process from 'node:process'

/**
 * 宿主机指标(Bun / Node 专用,Workers 不引这个模块)。
 *
 * ponytail: CPU 用 1 分钟 loadavg 折算,不做采样计算真实使用率——采样要么阻塞要么得常驻定时器。
 * 已知天花板:Windows 的 loadavg 恒为 0;要真实使用率就得改成两次 os.cpus() 采样求差。
 */
export async function readLocalSystemMetrics(): Promise<SystemMetrics | null> {
  try {
    const cpuCores = os.cpus().length || 1
    const cpuLoad = os.loadavg()[0] ?? 0
    const memory = await readMemory()
    const storage = await readStorage()

    return {
      cpuCores,
      cpuLoad,
      cpuLoadPercent: toPercent(cpuLoad, cpuCores),
      memoryTotal: memory.total,
      memoryUsed: memory.used,
      memoryUsedPercent: toPercent(memory.used, memory.total),
      processMemory: process.memoryUsage().rss,
      storageTotal: storage.total,
      storageUsed: storage.used,
      storageUsedPercent: toPercent(storage.used, storage.total),
      uptimeSeconds: Math.round(os.uptime()),
    }
  } catch {
    return null
  }
}

/**
 * 内存口径按部署环境取,优先级:cgroup v2 限额(容器里才是真上限)→ Linux MemAvailable → os.freemem()。
 * 不能直接用 total - freemem:freemem 不含可回收的页缓存,Linux/macOS 上会常年显示 90%+,
 * 一个永远飘红的指标等于没有指标。
 */
async function readMemory(): Promise<{ total: number, used: number }> {
  const cgroup = await readCgroupMemory()
  if (cgroup) {
    return cgroup
  }

  const available = await readLinuxAvailableMemory()
  const total = os.totalmem()

  return {
    total,
    used: Math.max(0, total - (available ?? os.freemem())),
  }
}

async function readCgroupMemory(): Promise<{ total: number, used: number } | null> {
  const [max, current] = await Promise.all([
    readFileText('/sys/fs/cgroup/memory.max'),
    readFileText('/sys/fs/cgroup/memory.current'),
  ])
  const total = Number(max?.trim())
  const used = Number(current?.trim())

  // memory.max 为 "max" 表示不限,此时 cgroup 没有比宿主机更准的信息。
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(used)) {
    return null
  }

  return { total, used: Math.max(0, used) }
}

async function readLinuxAvailableMemory(): Promise<number | null> {
  const meminfo = await readFileText('/proc/meminfo')
  const available = meminfo?.match(/^MemAvailable:\s+(\d+) kB$/m)?.[1]

  return available ? Number(available) * 1024 : null
}

async function readFileText(path: string): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises')
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

// 数据目录所在的文件系统;statfs 拿不到就当没有存储信息,不让仪表盘整块挂掉。
async function readStorage(): Promise<{ total: number, used: number }> {
  try {
    const { statfs } = await import('node:fs/promises')
    const stats = await statfs(process.cwd())
    const total = stats.blocks * stats.bsize
    const available = stats.bavail * stats.bsize

    return { total, used: Math.max(0, total - available) }
  } catch {
    return { total: 0, used: 0 }
  }
}

function toPercent(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0
  }

  return Math.round((value / total) * 1000) / 10
}
