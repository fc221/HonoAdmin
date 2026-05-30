import type { Context } from 'hono'
import type { AppEnv } from '../../infra/runtime/types'
import { createMiddleware } from 'hono/factory'
import { secureHeaders } from 'hono/secure-headers'
import { defaultSecurityRuntimeConfig } from '../../infra/runtime/security-config'
import { formatSize } from '../../utils/common'
import { ForbiddenError } from '../../utils/errors'
import {
  prepareCsrfToken,
  verifyCsrfRequest,
} from '../security/csrf'

const csrfFailureMessage = '页面令牌已过期，正在刷新页面。'
const csrfRefreshHeaderName = 'X-HonoAdmin-CSRF-Refresh'
const csrfTokenRefreshPath = '/csrf-token'
const csrfRefreshDelaySeconds = 1.2

export const requestBodyLimit = createMiddleware<AppEnv>(async (c, next) => {
  const maxSize = c.config?.security.maxRequestBodySizeBytes
    ?? defaultSecurityRuntimeConfig.maxRequestBodySizeBytes

  if (!c.req.raw.body) {
    return next()
  }

  const hasTransferEncoding = c.req.raw.headers.has('transfer-encoding')
  const contentLength = Number(c.req.raw.headers.get('content-length') ?? 0)
  if (
    Number.isFinite(contentLength)
    && contentLength > maxSize
    && !hasTransferEncoding
  ) {
    return c.text(`请求体不能超过 ${formatSize(maxSize)}。`, 413)
  }

  let size = 0
  const chunks: Uint8Array[] = []
  const reader = c.req.raw.body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    size += value.length
    if (size > maxSize) {
      return c.text(`请求体不能超过 ${formatSize(maxSize)}。`, 413)
    }

    chunks.push(value)
  }

  c.req.raw = new Request(c.req.raw.url, createRequestInit(c.req.raw, chunks))

  await next()
})

function createRequestInit(
  request: Request,
  chunks: Uint8Array[],
): RequestInit {
  return {
    body: createBodyStream(chunks),
    duplex: 'half',
    headers: request.headers,
    method: request.method,
  } as unknown as RequestInit & { duplex: 'half' }
}

function createBodyStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })
}

// `unsafe-inline` is required for the inline layout-bootstrap script in
// `_renderer.tsx` and for honox's streaming-SSR replacement script.
export const headers = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ['\'self\''],
    scriptSrc: ['\'self\'', '\'unsafe-inline\''],
    styleSrc: ['\'self\'', '\'unsafe-inline\''],
    imgSrc: ['\'self\'', 'data:', 'https:'],
    fontSrc: ['\'self\'', 'data:', 'https:'],
    connectSrc: ['\'self\''],
    frameAncestors: ['\'none\''],
    objectSrc: ['\'none\''],
    formAction: ['\'self\''],
    baseUri: ['\'self\''],
  },
  xFrameOptions: 'DENY',
  referrerPolicy: 'same-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  },
  crossOriginEmbedderPolicy: false,
})

export const csrf = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.path === csrfTokenRefreshPath) {
    await next()
    return
  }

  if (shouldVerifyCsrf(c.req.method, c.req.path)) {
    if (!await verifyCsrfRequest(c)) {
      return await respondToCsrfFailure(c)
    }
  }

  await prepareCsrfToken(c)
  await next()
})

function shouldVerifyCsrf(method: string, path: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    return false
  }

  return !path.startsWith('/api/')
}

async function respondToCsrfFailure(c: Context<AppEnv>): Promise<Response> {
  await prepareCsrfToken(c)

  if (wantsJsonResponse(c)) {
    setCsrfRefreshHeaders(c)
    return c.json({
      error: {
        code: 'FORBIDDEN',
        message: csrfFailureMessage,
      },
      ok: false,
    }, 403)
  }

  const redirectPath = getSafeRefererPath(c)

  if (wantsTurboResponse(c)) {
    setCsrfRefreshHeaders(c)
    return c.text(csrfFailureMessage, 403)
  }

  if (redirectPath && wantsPageResponse(c)) {
    setCsrfRefreshHeaders(c)
    return c.html(renderCsrfRefreshPage(getRefreshPath(c, redirectPath)), 403)
  }

  if (wantsPageResponse(c)) {
    setCsrfRefreshHeaders(c)
    throw new ForbiddenError(csrfFailureMessage)
  }

  setCsrfRefreshHeaders(c)
  return c.text(csrfFailureMessage, 403)
}

function setCsrfRefreshHeaders(c: Context): void {
  c.header(csrfRefreshHeaderName, 'true')
  c.header('Cache-Control', 'no-store')
}

function wantsJsonResponse(c: Context): boolean {
  const accept = c.req.header('accept')?.toLowerCase() ?? ''

  return (
    accept.includes('application/json')
    || c.req.header('x-hono-file-upload') === 'true'
  )
}

function wantsTurboResponse(c: Context): boolean {
  const accept = c.req.header('accept')?.toLowerCase() ?? ''

  return (
    accept.includes('text/vnd.turbo-stream.html')
    || !!c.req.header('turbo-frame')
  )
}

function wantsPageResponse(c: Context): boolean {
  const accept = c.req.header('accept')?.toLowerCase() ?? ''

  return (
    accept.includes('text/html')
    || accept.includes('application/xhtml+xml')
    || accept.includes('text/vnd.turbo-stream.html')
  )
}

function getSafeRefererPath(c: Context): string | null {
  const referer = c.req.header('referer')

  if (!referer) {
    return null
  }

  try {
    const requestUrl = new URL(c.req.url)
    const refererUrl = new URL(referer, requestUrl)

    if (refererUrl.origin !== requestUrl.origin) {
      return null
    }

    return `${refererUrl.pathname}${refererUrl.search}`
  } catch {
    return null
  }
}

function getRefreshPath(c: Context, path: string): string {
  const url = new URL(path, 'http://hono-admin.local')
  url.searchParams.set('_csrfRefresh', String(getRequestNow(c)))
  return `${url.pathname}${url.search}`
}

function getRequestNow(c: Context): number {
  return typeof c.now === 'function' ? c.now() : Date.now()
}

function renderCsrfRefreshPage(redirectPath: string): string {
  const redirectPathJson = JSON.stringify(redirectPath)
  const escapedRedirectPath = escapeHtmlAttr(redirectPath)

  return `<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="${csrfRefreshDelaySeconds};url=${escapedRedirectPath}">
  <title>页面令牌已过期 - HonoAdmin</title>
  <link rel="stylesheet" href="/app/style.css">
</head>
<body class="min-h-screen bg-base-200 text-base-content">
  <main class="min-h-screen">
    <div class="toast toast-top toast-end z-50 pointer-events-none">
      <div class="alert pointer-events-auto max-w-sm shadow-lg alert-error" role="alert">
        <i class="icon-[ri--error-warning-line]"></i>
        <span>${csrfFailureMessage}</span>
      </div>
    </div>
  </main>
  <script>
    window.setTimeout(function () {
      window.location.replace(${redirectPathJson});
    }, ${csrfRefreshDelaySeconds * 1000});
  </script>
</body>
</html>`
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/[&"'<>]/g, (char) => ({
    '&': '&amp;',
    '"': '&quot;',
    '\'': '&#39;',
    '<': '&lt;',
    '>': '&gt;',
  })[char] ?? char)
}
