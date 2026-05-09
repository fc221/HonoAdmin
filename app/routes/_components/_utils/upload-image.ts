import type { FileUploadType } from '../../../service/admin/system/file/enum'

interface UploadResult {
  data: {
    id: number
    url: string
  }
  ok: true
}

export async function uploadImage(
  file: File,
  uploadType: FileUploadType,
): Promise<UploadResult['data']> {
  const body = new FormData()

  body.set('intent', 'upload')
  body.set('uploadType', uploadType)
  body.set('file', file)

  const response = await fetch('/admin/system/file', {
    body,
    headers: {
      'Accept': 'application/json',
      'X-Hono-File-Upload': 'true',
    },
    method: 'POST',
  })
  const result = await response.json().catch(() => null)

  if (!response.ok || !isUploadResult(result)) {
    throw new Error(getResponseErrorMessage(result))
  }

  return result.data
}

export function getUploadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '图片上传失败。'
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

function getResponseErrorMessage(value: unknown): string {
  if (value && typeof value === 'object') {
    const error = (value as { error?: { message?: unknown } }).error
    if (typeof error?.message === 'string' && error.message) {
      return error.message
    }
  }

  return '图片上传失败。'
}
