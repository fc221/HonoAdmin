import type { Migration } from '../types'

export const migration0002SiteManagement: Migration = {
  id: '0002_site_management',
  name: 'create site management tables',
  statements: [
    `
      CREATE TABLE IF NOT EXISTS web_page (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        alias VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(80),
        summary TEXT,
        content TEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      )
    
    `,
    `
      CREATE TABLE IF NOT EXISTS web_notification (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alias VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_top INT NOT NULL DEFAULT 0,
        is_important INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      )
    
    `,
    `
      CREATE TABLE IF NOT EXISTS web_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        contact VARCHAR(255),
        images TEXT,
        user_id INT,
        reply TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'close')),
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      )
    
    `,
    `
      CREATE INDEX idx_web_feedback_user_id
      ON web_feedback (user_id)
    
    `,
    `
      CREATE TABLE IF NOT EXISTS sys_operate_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        log_type VARCHAR(30) CHECK (
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
        action_key VARCHAR(255),
        method VARCHAR(255),
        request_method VARCHAR(20),
        req_data TEXT,
        res_data TEXT,
        client_ip VARCHAR(255),
        status VARCHAR(30) NOT NULL DEFAULT 'success' CHECK (
          status IN ('active', 'inactive', 'success', 'error', 'unknown')
        ),
        created_at DATETIME(3) NOT NULL
      )
    
    `,
    `
      CREATE INDEX idx_operate_log_user_id_created_at
      ON sys_operate_log (user_id, created_at)
    
    `
  ],
}
