import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { html } from 'hono/html'
import { jsxRenderer } from 'hono/jsx-renderer'
import { MemoryCacheAdapter } from '../app/infra/cache/adapter/memory'
import { resolveSecurityRuntimeConfig } from '../app/infra/runtime/security-config'
import errorHandler from '../app/routes/_error'
import {
  needsPasswordRehash,
  verifyUserPassword,
} from '../app/service/admin/system/user'
import { csrf, requestBodyLimit } from '../app/service/middleware/security'
import {
  csrfCookieName,
  csrfFieldName,
  csrfHeaderName,
  getPreparedCsrfToken,
  prepareCsrfToken,
} from '../app/service/security/csrf'
import {
  consumeRateLimit,
  createRateLimitKey,
} from '../app/service/security/rate-limit'
import { DatabaseError, toErrorShape, TooManyRequestsError } from '../app/utils/errors'
import { sanitizeRichTextHtml } from '../app/utils/html'

describe('security utilities', () => {
  test('rich text sanitizer blocks scriptable URLs and event handlers', () => {
    const html = sanitizeRichTextHtml(`
      <p onclick="alert(1)">hello <strong>world</strong></p>
      <a href=javascript:alert(1)>bad</a>
      <a href="https://example.com" target="_blank">ok</a>
      <img src=x onerror=alert(1)>
      <img src="/uploads/avatar/2026/01/a.png" alt="avatar">
      <script>alert(1)</script>
    `)

    expect(html).toContain('<p>hello <strong>world</strong></p>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('src="/uploads/avatar/2026/01/a.png"')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('src=x')
  })

  test('public error shape redacts internal database details', () => {
    const shape = toErrorShape(new DatabaseError('failed query', {
      causeMessage: 'syntax near password',
      sql: 'SELECT password FROM sys_user',
    }))

    expect(shape.status).toBe(500)
    expect(shape.body.error.message).toBe('服务暂时不可用。')
    expect(shape.body.error.details).toBeUndefined()
  })

  test('password verifier accepts legacy hashes but marks them for rehash', async () => {
    const salt = 'legacy-salt'
    const legacyHash = `sha256:${salt}:${await sha256Hex(`${salt}:secret123`)}`

    expect(await verifyUserPassword('secret123', legacyHash)).toBe(true)
    expect(await verifyUserPassword('wrong', legacyHash)).toBe(false)
    expect(needsPasswordRehash(legacyHash)).toBe(true)
  })

  test('request body limit rejects oversized requests', async () => {
    const app = new Hono()
    app.use('*', requestBodyLimit)
    app.post('/submit', async (c) => c.text(await c.req.text()))

    const response = await app.request('/submit', {
      body: 'x'.repeat(6 * 1024 * 1024 + 1),
      headers: { 'content-type': 'text/plain' },
      method: 'POST',
    })

    expect(response.status).toBe(413)
    expect(await response.text()).toContain('6MB')
  })

  test('csrf middleware requires a signed same-origin token for form posts', async () => {
    const app = new Hono()
    app.use('*', csrf)
    app.get('/form', (c) => c.text('ok'))
    app.post('/submit', (c) => c.text('saved'))

    const formResponse = await app.request('/form')
    const token = getCookieValue(
      formResponse.headers.get('set-cookie') ?? '',
      csrfCookieName,
    )

    expect(token).toContain('.')
    expect((await app.request('/submit', {
      body: new URLSearchParams(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'cookie': `${csrfCookieName}=${token}`,
      },
      method: 'POST',
    })).status).toBe(403)

    const response = await app.request('/submit', {
      body: new URLSearchParams(),
      headers: {
        [csrfHeaderName]: token,
        cookie: `${csrfCookieName}=${token}`,
      },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('saved')
  })

  test('csrf middleware shows native browser form failures before refreshing', async () => {
    const app = new Hono()
    app.use('*', csrf)
    app.get('/form', (c) => c.text('ok'))
    app.post('/submit', (c) => c.text('saved'))

    const response = await app.request('/submit', {
      body: new URLSearchParams(),
      headers: {
        'accept': 'text/html',
        'content-type': 'application/x-www-form-urlencoded',
        'referer': 'http://localhost/form?page=2',
      },
      method: 'POST',
    })
    const html = await response.text()

    expect(response.status).toBe(403)
    expect(response.headers.get('Location')).toBeNull()
    expect(response.headers.get('Set-Cookie')).toContain(csrfCookieName)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-HonoAdmin-CSRF-Refresh')).toBe('true')
    expect(html).toContain('页面令牌已过期，正在刷新页面。')
    expect(html).toContain('window.location.replace("/form?page=2&_csrfRefresh=')
  })

  test('csrf middleware issues a usable token after a native browser form failure', async () => {
    const app = new Hono()
    app.use('*', csrf)
    app.get('/form', (c) => c.text(getPreparedCsrfToken(c)))
    app.post('/submit', (c) => c.text('saved'))

    const failedResponse = await app.request('/submit', {
      body: new URLSearchParams(),
      headers: {
        'accept': 'text/html',
        'content-type': 'application/x-www-form-urlencoded',
        'referer': 'http://localhost/form',
      },
      method: 'POST',
    })
    const refreshedCookie = getCookieValue(
      failedResponse.headers.get('set-cookie') ?? '',
      csrfCookieName,
    )

    expect(refreshedCookie).toContain('.')

    const formResponse = await app.request('/form?_csrfRefresh=1', {
      headers: {
        cookie: `${csrfCookieName}=${refreshedCookie}`,
      },
    })
    const token = await formResponse.text()

    expect(token).toBe(refreshedCookie)

    const response = await app.request('/submit', {
      body: new URLSearchParams({
        [csrfFieldName]: token,
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'cookie': `${csrfCookieName}=${refreshedCookie}`,
      },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('saved')
  })

  test('csrf refresh endpoint returns a usable token before submit', async () => {
    const app = new Hono()
    app.use('*', csrf)
    app.get('/form', (c) => c.text(getPreparedCsrfToken(c)))
    app.get('/csrf-token', async (c) => {
      const token = await prepareCsrfToken(c)
      c.header('Cache-Control', 'no-store')
      return c.json({
        csrf: {
          field: csrfFieldName,
          header: csrfHeaderName,
          token,
        },
        ok: true,
      })
    })
    app.post('/submit', (c) => c.text('saved'))

    const formResponse = await app.request('/form')
    const originalToken = getCookieValue(
      formResponse.headers.get('set-cookie') ?? '',
      csrfCookieName,
    )
    const refreshResponse = await app.request('/csrf-token', {
      headers: {
        'cookie': `${csrfCookieName}=${originalToken}`,
        'X-HonoAdmin-CSRF-Refresh': 'true',
      },
    })
    const refreshBody = await refreshResponse.json() as {
      csrf: {
        token: string
      }
    }
    const refreshedToken = getCookieValue(
      refreshResponse.headers.get('set-cookie') ?? '',
      csrfCookieName,
    )

    expect(refreshResponse.status).toBe(200)
    expect(refreshResponse.headers.get('Cache-Control')).toBe('no-store')
    expect(refreshedToken).toContain('.')
    expect(refreshBody.csrf.token).toBe(refreshedToken)

    const response = await app.request('/submit', {
      body: new URLSearchParams({
        [csrfFieldName]: refreshedToken,
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'cookie': `${csrfCookieName}=${refreshedToken}`,
      },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('saved')
  })

  test('csrf middleware lets turbo show a prompt before refreshing', async () => {
    const app = new Hono()
    app.use('*', csrf)
    app.post('/submit', (c) => c.text('saved'))

    const response = await app.request('/submit', {
      body: new URLSearchParams(),
      headers: {
        'accept': 'text/vnd.turbo-stream.html, text/html',
        'content-type': 'application/x-www-form-urlencoded',
        'referer': 'http://localhost/form?page=2',
        'turbo-frame': '_top',
      },
      method: 'POST',
    })

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-HonoAdmin-CSRF-Refresh')).toBe('true')
    expect(await response.text()).toContain('页面令牌已过期，正在刷新页面。')
  })

  test('csrf middleware renders an error page for browser failures without a safe referer', async () => {
    const app = new Hono()
    app.use('*', jsxRenderer(({ children }) => html`${children}`))
    app.use('*', csrf)
    app.onError(errorHandler)
    app.post('/submit', (c) => c.text('saved'))

    const response = await app.request('/submit', {
      headers: {
        accept: 'text/html',
      },
      method: 'POST',
    })
    const responseHtml = await response.text()

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-HonoAdmin-CSRF-Refresh')).toBe('true')
    expect(responseHtml).toContain('页面令牌已过期，正在刷新页面。')
    expect(responseHtml).toContain('没有权限')
  })

  test('csrf middleware returns json errors for json requests', async () => {
    const app = new Hono()
    app.use('*', csrf)
    app.post('/submit', (c) => c.text('saved'))

    const response = await app.request('/submit', {
      headers: {
        accept: 'application/json',
      },
      method: 'POST',
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-HonoAdmin-CSRF-Refresh')).toBe('true')
    expect(body).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: '页面令牌已过期，正在刷新页面。',
      },
      ok: false,
    })
  })

  test('security runtime config reads optional numeric env values', () => {
    const config = resolveSecurityRuntimeConfig((key) => ({
      API_RATE_LIMIT_MAX: '240',
      API_RATE_LIMIT_WINDOW_SECONDS: '120',
      LOGIN_RATE_LIMIT_ACCOUNT_MAX: '12',
      LOGIN_RATE_LIMIT_IP_MAX: '40',
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: '600',
      REQUEST_BODY_LIMIT_BYTES: '1048576',
      UPLOAD_IMAGE_LIMIT_BYTES: '524288',
    })[key])

    expect(config).toMatchObject({
      apiRateLimitMax: 240,
      apiRateLimitWindowSeconds: 120,
      loginRateLimitAccountMax: 12,
      loginRateLimitIpMax: 40,
      loginRateLimitWindowSeconds: 600,
      maxRequestBodySizeBytes: 1048576,
      maxUploadImageSizeBytes: 524288,
    })
  })

  test('rate limiter blocks after configured attempts', async () => {
    const cache = new MemoryCacheAdapter('security-test')
    const requestContext = { cache }
    const key = await createRateLimitKey('test', '127.0.0.1', 'admin')

    await consumeRateLimit(requestContext, {
      key,
      limit: 2,
      windowSeconds: 60,
    })
    await consumeRateLimit(requestContext, {
      key,
      limit: 2,
      windowSeconds: 60,
    })
    await expect(consumeRateLimit(requestContext, {
      key,
      limit: 2,
      windowSeconds: 60,
    })).rejects.toBeInstanceOf(TooManyRequestsError)
  })
})

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function getCookieValue(setCookie: string, name: string): string {
  const cookie = setCookie
    .split(';')
    .find((part) => part.trim().startsWith(`${name}=`))

  return cookie?.trim().slice(name.length + 1).replace(/^"|"$/g, '') ?? ''
}
