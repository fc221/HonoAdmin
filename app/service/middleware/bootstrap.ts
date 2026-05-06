import type { Context } from 'hono'
import type { MigrationStatus } from '../../infra/database'
import type { AppEnv } from '../../infra/runtime'
import { createMiddleware } from 'hono/factory'
import { getDatabaseMigrationStatus } from '../admin/system/update'

const installPath = '/install'
const migrationPaths = new Set([
  '/admin/login',
  '/admin/logout',
  '/user/login',
  '/user/logout',
  '/admin/system/update',
  '/admin/system/update/status',
])

export const guard = createMiddleware<AppEnv>(async (c, next) => {
  if (isBypassPath(c.req.path)) {
    await next()
    return
  }

  if (!c.config.bootstrap.isConfigured) {
    if (c.req.path === installPath) {
      await next()
      return
    }

    return handleRedirect(c, installPath, '运行时配置尚未完成。')
  }

  const migration = await getDatabaseMigrationStatus(c)
  if (migration.isComplete) {
    await next()
    return
  }

  if (migration.isFreshDatabase) {
    if (c.req.path === installPath) {
      await next()
      return
    }

    return handleRedirect(c, installPath, '数据库尚未初始化。')
  }

  if (migrationPaths.has(c.req.path)) {
    await next()
    return
  }

  if (!isAdminPath(c.req.path)) {
    return handleUserSideMigrationStatus(c, migration)
  }

  return handleRedirect(c, '/admin/system/update', '数据库需要先完成迁移。')
})

function handleRedirect(
  c: Context<AppEnv>,
  path: string,
  message: string,
): Response {
  if (c.req.method === 'GET') {
    return c.redirect(path, 302)
  }

  return c.text(message, 409)
}

function isBypassPath(path: string): boolean {
  return (
    path === '/favicon.ico'
    || path.startsWith('/app/')
    || path.startsWith('/static/')
  )
}

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/')
}

function handleUserSideMigrationStatus(
  c: Context<AppEnv>,
  migration: MigrationStatus,
): Response {
  if (c.req.method !== 'GET') {
    return c.text('系统正在维护升级，请稍后再试。', 409)
  }

  c.status(503)
  c.header('Cache-Control', 'no-store')
  c.header('Retry-After', '120')
  return c.html(renderUserSideMigrationStatus(c, migration))
}

function renderUserSideMigrationStatus(
  c: Context<AppEnv>,
  migration: MigrationStatus,
): string {
  const pendingItems = migration.pendingMigrations
    .slice(0, 6)
    .map((item) => `
      <li>
        <span>${escapeHtml(item.id)}</span>
        <span>${escapeHtml(item.name)}</span>
      </li>
    `)
    .join('')
  const remainingCount = Math.max(
    0,
    migration.pendingMigrations.length - 6,
  )
  const remaining = remainingCount
    ? `<p class="remaining">另有 ${remainingCount} 个迁移等待执行。</p>`
    : ''

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>系统维护中 - ${escapeHtml(c.config.appName)}</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      background: #f4f4f5;
      color: #18181b;
    }
    main {
      width: min(92vw, 560px);
      box-sizing: border-box;
      border: 1px solid #e4e4e7;
      border-radius: 16px;
      background: #fff;
      padding: 28px;
      box-shadow: 0 20px 50px rgb(24 24 27 / 8%);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: #2563eb;
      font-size: 14px;
      font-weight: 700;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.25;
    }
    .lead {
      margin: 12px 0 0;
      color: #52525b;
    }
    dl {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
      margin: 24px 0 0;
    }
    .stat {
      border-radius: 12px;
      background: #f4f4f5;
      padding: 12px;
    }
    dt {
      color: #71717a;
      font-size: 12px;
    }
    dd {
      margin: 4px 0 0;
      overflow-wrap: anywhere;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      font-weight: 700;
    }
    ul {
      margin: 20px 0 0;
      padding: 0;
      list-style: none;
      border-top: 1px solid #e4e4e7;
    }
    li {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 12px;
      border-bottom: 1px solid #e4e4e7;
      padding: 10px 0;
      color: #52525b;
      font-size: 13px;
    }
    li span {
      overflow-wrap: anywhere;
    }
    .remaining {
      margin: 12px 0 0;
      color: #71717a;
      font-size: 13px;
    }
    .footer {
      margin: 20px 0 0;
      color: #71717a;
      font-size: 13px;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #18181b;
        color: #fafafa;
      }
      main {
        border-color: #3f3f46;
        background: #27272a;
      }
      .lead,
      li {
        color: #d4d4d8;
      }
      .stat {
        background: #3f3f46;
      }
      dt,
      .remaining,
      .footer {
        color: #a1a1aa;
      }
      ul,
      li {
        border-color: #3f3f46;
      }
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">系统维护</p>
    <h1>服务正在升级，请稍后再试。</h1>
    <p class="lead">当前代码版本和数据库迁移版本不一致，管理员完成数据库迁移后，用户中心会自动恢复访问。</p>
    <dl>
      <div class="stat">
        <dt>代码迁移</dt>
        <dd>${escapeHtml(migration.latestCodeMigrationId ?? '-')}</dd>
      </div>
      <div class="stat">
        <dt>数据库迁移</dt>
        <dd>${escapeHtml(migration.latestAppliedMigrationId ?? '-')}</dd>
      </div>
      <div class="stat">
        <dt>应用版本</dt>
        <dd>${escapeHtml(c.config.appVersion)}</dd>
      </div>
      <div class="stat">
        <dt>待执行迁移</dt>
        <dd>${migration.pendingCount}</dd>
      </div>
    </dl>
    ${pendingItems ? `<ul>${pendingItems}</ul>${remaining}` : ''}
    <p class="footer">如果你是管理员，请前往后台更新管理完成迁移。</p>
  </main>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}
