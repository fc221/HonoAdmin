import type { AppEnv } from '@hono-admin/runtime'
import type { WebPageRecord } from '../service/admin/web/page/dto'
import { escapeHtml } from '@hono-admin/utils/html'
import { Hono } from 'hono'
import { getWebPageByAlias } from '../service/admin/web/page'
import { aliasPattern } from '../service/common/alias'
import { NotFoundError } from '../utils/errors'

const publicPageApp = new Hono<AppEnv>()
  .get('/:alias', async (c) => {
    const alias = c.req.param('alias').trim()
    if (!alias || !aliasPattern.test(alias)) {
      return c.html(renderPageNotFound(), 404)
    }

    try {
      return c.html(renderPublicPage(await getWebPageByAlias(c, alias)))
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.html(renderPageNotFound(), 404)
      }
      throw error
    }
  })

export default publicPageApp

function renderPublicPage(page: WebPageRecord): string {
  const title = escapeHtml(page.title)
  const summary = page.summary ? escapeHtml(page.summary) : ''

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    ${summary ? `<meta name="description" content="${summary}">` : ''}
    <style>
      body { margin: 0; color: #111827; background: #f6f7fb; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(880px, calc(100% - 32px)); margin: 48px auto; padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
      h1 { margin: 0 0 12px; font-size: 28px; line-height: 1.25; }
      .ha-public-page-summary { margin: 0 0 28px; color: #6b7280; line-height: 1.7; }
      .ha-public-page-content { line-height: 1.8; word-break: break-word; }
      .ha-public-page-content img { max-width: 100%; height: auto; border-radius: 6px; }
      .ha-public-page-content a { color: #2563eb; }
      .ha-public-page-content blockquote { margin-left: 0; padding-left: 12px; color: #4b5563; border-left: 3px solid #2563eb; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      ${summary ? `<p class="ha-public-page-summary">${summary}</p>` : ''}
      <article class="ha-public-page-content">${page.content}</article>
    </main>
  </body>
</html>`
}

function renderPageNotFound(): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>页面不存在</title>
  </head>
  <body>
    <main>
      <h1>页面不存在</h1>
    </main>
  </body>
</html>`
}
