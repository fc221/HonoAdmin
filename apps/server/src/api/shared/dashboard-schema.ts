import { z } from 'zod'

export const dashboardStatSchema = z.object({
  label: z.string(),
  tone: z.enum(['default', 'primary', 'success', 'warning']).default('default'),
  value: z.string(),
})

export const dashboardActivityPointSchema = z.object({
  label: z.string(),
  total: z.number(),
})

export const dashboardLogSchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  message: z.string(),
  status: z.string(),
  username: z.string(),
})

export const dashboardFeedbackSchema = z.object({
  createdAt: z.string(),
  id: z.number(),
  title: z.string(),
  username: z.string(),
})

// 宿主机指标:只有 Bun / Node 有,Workers 上为 null。
export const dashboardLoadSchema = z.object({
  cpuCores: z.number(),
  cpuLoad: z.number(),
  cpuLoadPercent: z.number(),
  memoryTotal: z.number(),
  memoryUsed: z.number(),
  memoryUsedPercent: z.number(),
  processMemory: z.number(),
  storageTotal: z.number(),
  storageUsed: z.number(),
  storageUsedPercent: z.number(),
  uptimeSeconds: z.number(),
})

export const dashboardSystemSchema = z.object({
  appVersion: z.string(),
  databaseDialect: z.string(),
  migrationsApplied: z.number(),
  migrationsPending: z.number(),
  timezone: z.string(),
})

// 后台仪表盘独有的板块给默认值,这样用户仪表盘只回 stats/title 也照样通过校验。
export const dashboardPayloadSchema = z.object({
  activity: z.array(dashboardActivityPointSchema).default([]),
  // 跨用户操作日志、待处理反馈、系统信息、服务器负载属于管理员专属;非管理员(如默认 user 角色)
  // 只拿基础 stats,这个标志让前端据此显隐敏感面板。
  canViewSystemPanels: z.boolean().default(false),
  feedbacks: z.array(dashboardFeedbackSchema).default([]),
  load: dashboardLoadSchema.nullable().default(null),
  logs: z.array(dashboardLogSchema).default([]),
  stats: z.array(dashboardStatSchema),
  // 区间统计(sys_metric_bucket)最新更新时间的毫秒时间戳,用于「更新于」展示;无数据为 null。
  statsUpdatedAt: z.number().nullable().default(null),
  system: dashboardSystemSchema.nullable().default(null),
  title: z.string(),
})

export type DashboardPayload = z.infer<typeof dashboardPayloadSchema>
