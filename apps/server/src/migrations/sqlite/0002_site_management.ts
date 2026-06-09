import type { Migration } from '../types'

export const migration0002SiteManagement: Migration = {
  id: '0002_site_management',
  name: 'create site management tables',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS web_page (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        alias TEXT NOT NULL UNIQUE,
        category TEXT,
        summary TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS web_notification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alias TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_top INTEGER NOT NULL DEFAULT 0,
        is_important INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS web_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        contact TEXT,
        images TEXT,
        user_id INTEGER,
        reply TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'close')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_web_feedback_user_id
      ON web_feedback (user_id)
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_operate_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        log_type TEXT CHECK (
          log_type IN (
            'login',
            'logout',
            'operation',
            'deleteOne',
            'createOne',
            'updateOne',
            'empty',
            'unknown'
          )
        ),
        log_msg TEXT,
        log_data TEXT,
        error_msg TEXT,
        action_key TEXT,
        method TEXT,
        request_method TEXT,
        req_data TEXT,
        res_data TEXT,
        client_ip TEXT,
        status TEXT NOT NULL DEFAULT 'success' CHECK (
          status IN ('active', 'inactive', 'success', 'error', 'unknown')
        ),
        created_at INTEGER NOT NULL
      )
    `,
    `
      CREATE INDEX IF NOT EXISTS idx_operate_log_user_id_created_at
      ON sys_operate_log (user_id, created_at)
    `,
  ],
}
