import type { AppEnv } from '../../infra/runtime/types'
import { createMiddleware } from 'hono/factory'
import { defaultSecurityRuntimeConfig } from '../../infra/runtime/security-config'
import {
  prepareCsrfToken,
  verifyCsrfRequest,
} from '../security/csrf'

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

export const headers = createMiddleware<AppEnv>(async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'same-origin')
  c.header('X-Frame-Options', 'DENY')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

export const csrf = createMiddleware<AppEnv>(async (c, next) => {
  if (shouldVerifyCsrf(c.req.method, c.req.path)) {
    if (!await verifyCsrfRequest(c)) {
      return c.text('CSRF 校验失败，请刷新页面后重试。', 403)
    }
  }

  await prepareCsrfToken(c)
  await next()
})

function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024
  return Number.isInteger(mb) ? `${mb}MB` : `${bytes} bytes`
}

function shouldVerifyCsrf(method: string, path: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    return false
  }

  return !path.startsWith('/api/')
}
