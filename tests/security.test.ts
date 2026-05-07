import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { MemoryCacheAdapter } from '../app/infra/cache/adapter/memory'
import { resolveSecurityRuntimeConfig } from '../app/infra/runtime/security-config'
import {
  needsPasswordRehash,
  verifyUserPassword,
} from '../app/service/admin/system/user'
import { requestBodyLimit } from '../app/service/middleware/security'
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
