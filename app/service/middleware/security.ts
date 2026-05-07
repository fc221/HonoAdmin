import type { AppEnv } from '../../infra/runtime/types'
import { createMiddleware } from 'hono/factory'
import { defaultSecurityRuntimeConfig } from '../../infra/runtime/security-config'

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

  const requestInit = {
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    }),
    duplex: 'half',
  } as unknown as RequestInit

  c.req.raw = new Request(c.req.raw, requestInit)

  await next()
})

export const headers = createMiddleware<AppEnv>(async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'same-origin')
  c.header('X-Frame-Options', 'DENY')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024
  return Number.isInteger(mb) ? `${mb}MB` : `${bytes} bytes`
}
