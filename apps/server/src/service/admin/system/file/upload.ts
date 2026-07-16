import type { FileUploadType } from './enum'
import { formatFileSize } from '@hono-admin/utils/common'
import { ValidationError } from '../../../../utils/errors'

const allowedMimeTypes = new Map<string, string>([
  ['image/gif', 'gif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const allowedExtensions = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp'])

export async function normalizeUploadedFile(
  file: File,
  maxFileSizeBytes: number,
): Promise<{
  body: ArrayBuffer
  extension: string
  mimeType: string
  originalName: string
  size: number
}> {
  const originalName = file.name.trim() || 'upload'
  const mimeType = normalizeMimeType(file.type)
  const extension = getFileExtension(originalName)

  if (file.size <= 0) {
    throw new ValidationError('请选择要上传的图片。', { field: 'file' })
  }

  if (file.size > maxFileSizeBytes) {
    throw new ValidationError(`图片不能超过 ${formatFileSize(maxFileSizeBytes)}。`, {
      field: 'file',
      maxFileSizeBytes,
    })
  }

  if (!allowedMimeTypes.has(mimeType)) {
    throw new ValidationError('仅支持 JPG、PNG、WEBP、GIF 图片。', {
      field: 'file',
      mimeType,
    })
  }

  if (!allowedExtensions.has(extension)) {
    throw new ValidationError('图片扩展名必须是 jpg、png、webp 或 gif。', {
      extension,
      field: 'file',
    })
  }
  const body = await file.arrayBuffer()
  const detectedMimeType = detectImageMimeType(new Uint8Array(body))
  if (!detectedMimeType || detectedMimeType !== mimeType) {
    throw new ValidationError('图片文件内容和类型不匹配。', {
      detectedMimeType,
      field: 'file',
      mimeType,
    })
  }

  return {
    body,
    extension: allowedMimeTypes.get(detectedMimeType) ?? extension,
    mimeType,
    originalName,
    size: file.size,
  }
}

function normalizeMimeType(value: string): string {
  return value.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

function detectImageMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && hasBytes(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return 'image/png'
  }

  if (bytes.length >= 3 && hasBytes(bytes, [0xFF, 0xD8, 0xFF])) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 6
    && (
      hasAscii(bytes, 'GIF87a', 0)
      || hasAscii(bytes, 'GIF89a', 0)
    )
  ) {
    return 'image/gif'
  }

  if (
    bytes.length >= 12
    && hasAscii(bytes, 'RIFF', 0)
    && hasAscii(bytes, 'WEBP', 8)
  ) {
    return 'image/webp'
  }

  return null
}

function hasBytes(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((byte, index) => bytes[index] === byte)
}

function hasAscii(bytes: Uint8Array, value: string, offset: number): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) {
      return false
    }
  }

  return true
}

export function createStorageKey(
  uploadType: FileUploadType,
  extension: string,
  now: number,
): string {
  const date = new Date(now)
  const year = Number.isFinite(date.getTime())
    ? String(date.getUTCFullYear())
    : 'unknown'
  const month = Number.isFinite(date.getTime())
    ? String(date.getUTCMonth() + 1).padStart(2, '0')
    : '00'

  return `${uploadType}/${year}/${month}/${crypto.randomUUID()}.${extension}`
}

function getFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.trim().toLowerCase()
  return extension && extension !== fileName.toLowerCase() ? extension : ''
}
