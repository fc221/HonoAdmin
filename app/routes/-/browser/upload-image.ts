import type { FileUploadType } from '../../../service/admin/system/file/enum'
import {
  ensureFreshCsrfToken,
  getCsrfHeaderName,
  getCsrfToken,
} from './csrf'
import {
  refreshPageForExpiredCsrf,
  shouldRefreshForCsrfXhr,
} from './csrf-refresh'

interface UploadResult {
  data: {
    fileSize?: number
    id: number
    mimeType?: string
    originalName?: string
    url: string
  }
  ok: true
}

interface UploadImageOptions {
  onProgress?: (progress: number) => void
}

interface UploadFileOptions extends UploadImageOptions {
  file: File
  uploadType: FileUploadType
}

export async function uploadImage(
  file: File,
  uploadType: FileUploadType,
  options: UploadImageOptions = {},
): Promise<UploadResult['data']> {
  return uploadFile({
    file,
    onProgress: options.onProgress,
    uploadType,
  })
}

async function uploadFile({
  file,
  onProgress,
  uploadType,
}: UploadFileOptions): Promise<UploadResult['data']> {
  await ensureFreshCsrfToken().catch(() => getCsrfToken())

  const body = new FormData()

  body.set('intent', 'upload')
  body.set('uploadType', uploadType)
  body.set('file', file)

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('POST', '/admin/system/file')
    request.setRequestHeader('Accept', 'application/json')
    request.setRequestHeader('X-Hono-File-Upload', 'true')
    request.setRequestHeader(getCsrfHeaderName(), getCsrfToken())

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) {
        return
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100))
    })

    request.addEventListener('load', () => {
      const result = parseUploadResult(request.responseText)
      if (shouldRefreshForCsrfFailure(request)) {
        refreshPageForExpiredCsrf()
        reject(new Error('页面令牌已过期，正在刷新页面。'))
        return
      }

      if (request.status < 200 || request.status >= 300 || !isUploadResult(result)) {
        reject(new Error(getResponseErrorMessage(result)))
        return
      }

      onProgress?.(100)
      resolve(result.data)
    })

    request.addEventListener('error', () => {
      reject(new Error('文件上传失败。'))
    })

    request.addEventListener('abort', () => {
      reject(new Error('文件上传已取消。'))
    })

    request.send(body)
  })
}

function shouldRefreshForCsrfFailure(request: XMLHttpRequest): boolean {
  return shouldRefreshForCsrfXhr(request)
}

export function getUploadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '文件上传失败。'
}

function isUploadResult(value: unknown): value is UploadResult {
  const result = value as Partial<UploadResult> | null
  return (
    !!result
    && result.ok === true
    && typeof result.data?.id === 'number'
    && typeof result.data.url === 'string'
  )
}

function parseUploadResult(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function getResponseErrorMessage(value: unknown): string {
  if (value && typeof value === 'object') {
    const error = (value as { error?: { message?: unknown } }).error
    if (typeof error?.message === 'string' && error.message) {
      return error.message
    }
  }

  return '文件上传失败。'
}
