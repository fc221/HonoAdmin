import type { SystemMetrics } from '@hono-admin/runtime'
import type { ServiceRequestContext } from '../../types'
import { formatDateTime, getRecentDayBuckets } from '@hono-admin/utils/datetime'
import { getAdminSessionUser } from '../session'
import { canAccessAdminPath } from '../system/role'
import { getDatabaseMigrationStatus } from '../system/update'

const activityDays = 7
const recentLogLimit = 6
const pendingFeedbackLimit = 5

export interface DashboardActivityPoint {
  label: string
  total: number
}

export interface DashboardLog {
  createdAt: string
  id: number
  message: string
  status: string
  username: string
}

export interface DashboardFeedback {
  createdAt: string
  id: number
  title: string
  username: string
}

export interface DashboardSystem {
  appVersion: string
  databaseDialect: string
  migrationsApplied: number
  migrationsPending: number
  timezone: string
}

export async function getAdminDashboardData(c: ServiceRequestContext): Promise<{
  activity: DashboardActivityPoint[]
  canViewSystemPanels: boolean
  feedbacks: DashboardFeedback[]
  load: SystemMetrics | null
  logs: DashboardLog[]
  stats: Array<{ label: string, tone: 'default' | 'primary' | 'success' | 'warning', value: string }>
  system: DashboardSystem | null
}> {
  // 敏感面板(操作日志明细 / 待处理反馈明细 / 系统信息 / 服务器负载 / 操作趋势)只给能进操作日志页的
  // 后台管理员;默认 user 角色虽持 admin.dashboard.view 能读本接口,但拿不到这些。root 直接放行。
  const canViewSystemPanels = await currentUserCanViewSystemPanels(c)

  const [
    users,
    roles,
    pages,
    notifications,
    openFeedbacks,
    files,
    jobs,
    logCount,
    activity,
    logs,
    feedbacks,
    system,
    load,
  ] = await Promise.all([
    countRows(c, 'SELECT COUNT(*) AS count FROM sys_user'),
    countRows(c, 'SELECT COUNT(*) AS count FROM sys_role'),
    countRows(c, 'SELECT COUNT(*) AS count FROM web_page'),
    countRows(c, 'SELECT COUNT(*) AS count FROM web_notification'),
    countRows(c, `SELECT COUNT(*) AS count FROM web_feedback WHERE status = 'open'`),
    countRows(c, 'SELECT COUNT(*) AS count FROM sys_file'),
    countRows(c, 'SELECT COUNT(*) AS count FROM sys_scheduled_job'),
    countRows(c, 'SELECT COUNT(*) AS count FROM sys_operate_log'),
    canViewSystemPanels ? getActivity(c) : Promise.resolve([]),
    canViewSystemPanels ? getRecentLogs(c) : Promise.resolve([]),
    canViewSystemPanels ? getPendingFeedbacks(c) : Promise.resolve([]),
    canViewSystemPanels ? getSystemInfo(c) : Promise.resolve(null),
    canViewSystemPanels ? (c.runtime.systemMetrics?.().catch(() => null) ?? null) : null,
  ])

  return {
    activity,
    canViewSystemPanels,
    feedbacks,
    load,
    logs,
    stats: [
      { label: '用户', tone: 'primary', value: String(users) },
      { label: '角色', tone: 'success', value: String(roles) },
      { label: '页面', tone: 'default', value: String(pages) },
      { label: '公告', tone: 'default', value: String(notifications) },
      { label: '待处理反馈', tone: openFeedbacks > 0 ? 'warning' : 'default', value: String(openFeedbacks) },
      { label: '文件', tone: 'default', value: String(files) },
      { label: '定时任务', tone: 'default', value: String(jobs) },
      { label: '操作日志', tone: 'default', value: String(logCount) },
    ],
    system,
  }
}

// 用「能否访问操作日志列表页」作为「是否后台管理员」的判据,与 requireApiSession 对该路由的判定一致。
async function currentUserCanViewSystemPanels(
  c: ServiceRequestContext,
): Promise<boolean> {
  const user = await getAdminSessionUser(c)
  if (!user) {
    return false
  }

  return canAccessAdminPath(c, user, '/admin/system/operate-log', 'GET', '*').catch(() => false)
}

/**
 * 近 N 天的操作日志计数。日边界按配置时区在 JS 里算好,SQL 只做区间求和,
 * 免得各方言写一套日期函数;一条查询出全部桶。
 */
async function getActivity(
  c: ServiceRequestContext,
): Promise<DashboardActivityPoint[]> {
  const buckets = getRecentDayBuckets(c.now(), c.config.timezone, activityDays)
  const sums = buckets
    .map((_, index) =>
      `SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS d${index}`)
    .join(',\n      ')
  const params = buckets.flatMap((bucket) => [bucket.start, bucket.end])

  const row = await c.db
    .first<Record<string, number>>(
      `
        SELECT
          ${sums}
        FROM sys_operate_log
        WHERE created_at >= ?
      `,
      [...params, buckets[0]?.start ?? 0],
    )
    .catch(() => null)

  return buckets.map((bucket, index) => ({
    label: bucket.label,
    total: Number(row?.[`d${index}`] ?? 0),
  }))
}

async function getRecentLogs(c: ServiceRequestContext): Promise<DashboardLog[]> {
  const rows = await c.db
    .query<{
    created_at: number
    id: number
    log_msg: string | null
    method: string | null
    status: string
    username: string | null
  }>(
      `
        SELECT
          log.id,
          log.log_msg,
          log.method,
          log.status,
          log.created_at,
          sys_user.username
        FROM sys_operate_log log
        LEFT JOIN sys_user ON sys_user.id = log.user_id
        ORDER BY log.created_at DESC, log.id DESC
        LIMIT ${recentLogLimit}
      `,
    )
    .catch(() => [])

  return rows.map((row) => ({
    createdAt: formatDateTime(row.created_at, c.config.timezone),
    id: row.id,
    message: row.log_msg || row.method || '未命名操作',
    status: row.status,
    username: row.username ?? '系统',
  }))
}

async function getPendingFeedbacks(
  c: ServiceRequestContext,
): Promise<DashboardFeedback[]> {
  const rows = await c.db
    .query<{
    created_at: number
    id: number
    title: string
    username: string | null
  }>(
      `
        SELECT
          feedback.id,
          feedback.title,
          feedback.created_at,
          sys_user.username
        FROM web_feedback feedback
        LEFT JOIN sys_user ON sys_user.id = feedback.user_id
        WHERE feedback.status = 'open'
        ORDER BY feedback.created_at DESC, feedback.id DESC
        LIMIT ${pendingFeedbackLimit}
      `,
    )
    .catch(() => [])

  return rows.map((row) => ({
    createdAt: formatDateTime(row.created_at, c.config.timezone),
    id: row.id,
    title: row.title,
    username: row.username ?? '访客',
  }))
}

async function getSystemInfo(c: ServiceRequestContext): Promise<DashboardSystem> {
  const migration = await getDatabaseMigrationStatus(c).catch(() => null)

  return {
    appVersion: c.config.appVersion,
    databaseDialect: c.db.dialect,
    migrationsApplied: migration?.appliedCount ?? 0,
    migrationsPending: migration?.pendingCount ?? 0,
    timezone: c.config.timezone,
  }
}

async function countRows(c: ServiceRequestContext, sql: string): Promise<number> {
  const row = await c.db.first<{ count: number }>(sql).catch(() => null)
  return Number(row?.count ?? 0)
}
