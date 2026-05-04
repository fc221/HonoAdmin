import type { Migration } from './types'

export const migration0004AdminPerformanceIndexes: Migration = {
  id: '0004_admin_performance_indexes',
  name: 'add admin list performance indexes',
  statements: [
    `
      CREATE INDEX IF NOT EXISTS idx_user_root_status
      ON "user" (is_root, status)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_web_notification_sort
      ON web_notification (is_top, created_at, id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_web_feedback_created_at_id
      ON web_feedback (created_at, id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_operate_log_created_at_id
      ON sys_operate_log (created_at, id)
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_operate_log_type_created_at_id
      ON sys_operate_log (log_type, created_at, id)
    `,
  ],
}
