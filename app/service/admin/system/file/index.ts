import type { FileStorageConfig } from '../../../../infra/file-storage'
import type { PaginatedResult } from '../../../common'
import type { ServiceContext } from '../../../types'
import type { ConfigEntity } from '../config'
import type {
  FileRecord,
  ListFileInput,
} from './dto'
import type { FileEntity } from './entity'
import type { FileStorageMode, FileUploadType } from './enum'
import { createFileStorageAdapter } from '../../../../infra/file-storage'
import { ConfigurationError, NotFoundError, ValidationError } from '../../../../utils'
import {
  buildKeywordCondition,
  buildWhereClause,
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common'
import { listFileSchema } from './dto'
import { fileStorageModes, fileUploadTypes } from './enum'

export * from './dto'
export * from './entity'
export * from './enum'

export interface UploadFileInput {
  file: File
  uploadType: FileUploadType
  userId?: number | null
}

export type FileAccessResult
  = | {
    body: ArrayBuffer
    cacheControl?: string
    contentType: string
    kind: 'body'
  }
  | {
    cacheControl?: string
    kind: 'redirect'
    status: 302
    url: string
  }

const maxFileSizeBytes = 5 * 1024 * 1024
const allowedMimeTypes = new Map<string, string>([
  ['image/gif', 'gif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const allowedExtensions = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp'])
const defaultLocalRoot = './uploads'
const defaultSignedUrlTtlSeconds = 300
const fileUrlPrefix = '/uploads/'

const fileColumns = `
  id,
  upload_type,
  storage_mode,
  storage_key,
  original_name,
  mime_type,
  file_size,
  user_id,
  created_at,
  updated_at
`

export async function listFiles(
  ctx: ServiceContext,
  input: ListFileInput = {},
): Promise<PaginatedResult<FileRecord>> {
  const listInput = listFileSchema.parse(input)
  const whereClause = buildWhereClause([
    listInput.uploadType
      ? { params: [listInput.uploadType], sql: 'upload_type = ?' }
      : null,
    buildKeywordCondition(listInput.keyword, [
      'storage_key',
      'original_name',
      'mime_type',
    ]),
  ])
  const total = await countFiles(ctx, whereClause.sql, whereClause.params)
  const pagination = resolvePagination(listInput, total)
  const rows = await ctx.db.query<FileEntity>(`
    SELECT ${fileColumns}
    FROM sys_file
    ${whereClause.sql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `, [
    ...whereClause.params,
    pagination.pageSize,
    getPaginationOffset(pagination),
  ])

  return createPaginatedResult(
    rows.map(toFileRecord),
    total,
    pagination,
  )
}

export async function uploadFile(
  ctx: ServiceContext,
  input: UploadFileInput,
): Promise<FileRecord> {
  if (!fileUploadTypes.includes(input.uploadType)) {
    throw new ValidationError('文件上传类型不正确。', {
      uploadType: input.uploadType,
    })
  }

  const normalizedFile = await normalizeUploadedFile(input.file)
  const config = await resolveFileStorageConfig(ctx)
  const adapter = await createFileStorageAdapter(config)
  const storageKey = createStorageKey(
    input.uploadType,
    normalizedFile.extension,
    ctx.now(),
  )

  await adapter.put({
    body: normalizedFile.body,
    contentType: normalizedFile.mimeType,
    storageKey,
  })

  try {
    const now = ctx.now()
    const result = await ctx.db.execute(
      `
        INSERT INTO sys_file (
          upload_type,
          storage_mode,
          storage_key,
          original_name,
          mime_type,
          file_size,
          user_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.uploadType,
        config.mode,
        storageKey,
        normalizedFile.originalName,
        normalizedFile.mimeType,
        normalizedFile.size,
        input.userId ?? null,
        now,
        now,
      ],
    )

    return getFileById(ctx, Number(result.lastInsertId))
  } catch (error) {
    await adapter.delete(storageKey).catch(() => {})
    throw error
  }
}

export async function deleteFile(ctx: ServiceContext, id: number): Promise<void> {
  const file = await requireFile(ctx, id)
  const adapter = await createFileStorageAdapter(
    await resolveFileStorageConfig(ctx, file.storage_mode),
  )

  await adapter.delete(file.storage_key)
  await ctx.db.execute('DELETE FROM sys_file WHERE id = ?', [id])
}

export async function getFileById(
  ctx: ServiceContext,
  id: number,
): Promise<FileRecord> {
  return toFileRecord(await requireFile(ctx, id))
}

export async function getFileByStorageKey(
  ctx: ServiceContext,
  storageKey: string,
): Promise<FileRecord> {
  return toFileRecord(await requireFileByStorageKey(ctx, storageKey))
}

export async function getFileAccess(
  ctx: ServiceContext,
  storageKey: string,
): Promise<FileAccessResult> {
  const file = await requireFileByStorageKey(ctx, storageKey)
  const adapter = await createFileStorageAdapter(
    await resolveFileStorageConfig(ctx, file.storage_mode),
  )

  return adapter.getAccess({
    contentType: file.mime_type,
    storageKey: file.storage_key,
  })
}

async function normalizeUploadedFile(file: File): Promise<{
  body: ArrayBuffer
  extension: string
  mimeType: string
  originalName: string
  size: number
}> {
  const originalName = file.name.trim() || 'upload'
  const mimeType = file.type.trim().toLowerCase()
  const extension = getFileExtension(originalName)

  if (file.size <= 0) {
    throw new ValidationError('请选择要上传的图片。', { field: 'file' })
  }

  if (file.size > maxFileSizeBytes) {
    throw new ValidationError('图片不能超过 5MB。', {
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

  return {
    body: await file.arrayBuffer(),
    extension: allowedMimeTypes.get(mimeType) ?? extension,
    mimeType,
    originalName,
    size: file.size,
  }
}

async function resolveFileStorageConfig(
  ctx: ServiceContext,
  preferredMode?: FileStorageMode,
): Promise<FileStorageConfig> {
  const configs = await listFileConfigValues(ctx)
  const configuredMode = normalizeStorageMode(
    preferredMode ?? configs.get('file_storage_driver'),
  )
  const mode = ctx.config.runtimeTarget === 'cloudflare-workers'
    && configuredMode === 'local'
    ? 's3'
    : configuredMode

  if (mode === 'local') {
    return {
      mode,
      root: configs.get('file_local_root')?.trim() || defaultLocalRoot,
    }
  }

  const s3Config = {
    accessKeyId: configs.get('file_s3_access_key_id')?.trim() ?? '',
    bucket: configs.get('file_s3_bucket')?.trim() ?? '',
    endpoint: configs.get('file_s3_endpoint')?.trim() ?? '',
    mode,
    region: configs.get('file_s3_region')?.trim() || 'auto',
    secretAccessKey: configs.get('file_s3_secret_access_key')?.trim() ?? '',
    signedUrlTtlSeconds: normalizeSignedUrlTtl(
      configs.get('file_s3_signed_url_ttl_seconds'),
    ),
  }

  assertS3Config(s3Config)
  return s3Config
}

async function listFileConfigValues(
  ctx: ServiceContext,
): Promise<Map<string, string>> {
  const rows = await ctx.db.query<Pick<ConfigEntity, 'config_key' | 'config_value'>>(
    `
      SELECT config_key, config_value
      FROM config
      WHERE config_type = 'file'
        AND config_key IN (
          'file_storage_driver',
          'file_local_root',
          'file_s3_endpoint',
          'file_s3_region',
          'file_s3_bucket',
          'file_s3_access_key_id',
          'file_s3_secret_access_key',
          'file_s3_signed_url_ttl_seconds'
        )
    `,
  )

  return new Map(rows.map((row) => [row.config_key, row.config_value]))
}

function assertS3Config(
  config: Extract<FileStorageConfig, { mode: 's3' }>,
): void {
  const missing = [
    ['file_s3_endpoint', config.endpoint],
    ['file_s3_bucket', config.bucket],
    ['file_s3_access_key_id', config.accessKeyId],
    ['file_s3_secret_access_key', config.secretAccessKey],
  ].filter(([, value]) => !value)

  if (missing.length) {
    throw new ConfigurationError('S3 文件存储配置不完整。', {
      missing: missing.map(([key]) => key),
    })
  }
}

function normalizeStorageMode(value: unknown): FileStorageMode {
  return fileStorageModes.includes(value as FileStorageMode)
    ? value as FileStorageMode
    : 'local'
}

function normalizeSignedUrlTtl(value: string | undefined): number {
  const ttl = Number(value)

  if (!Number.isInteger(ttl) || ttl <= 0) {
    return defaultSignedUrlTtlSeconds
  }

  return Math.min(ttl, 604800)
}

async function countFiles(
  ctx: ServiceContext,
  whereSql: string,
  params: Parameters<ServiceContext['db']['first']>[1],
): Promise<number> {
  const row = await ctx.db.first<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM sys_file
      ${whereSql}
    `,
    params,
  )

  return row?.count ?? 0
}

async function requireFile(
  ctx: ServiceContext,
  id: number,
): Promise<FileEntity> {
  const row = await ctx.db.first<FileEntity>(
    `
      SELECT ${fileColumns}
      FROM sys_file
      WHERE id = ?
    `,
    [id],
  )

  if (!row) {
    throw new NotFoundError('文件不存在。', { id })
  }

  return row
}

async function requireFileByStorageKey(
  ctx: ServiceContext,
  storageKey: string,
): Promise<FileEntity> {
  const normalizedKey = normalizeStorageKey(storageKey)
  const row = await ctx.db.first<FileEntity>(
    `
      SELECT ${fileColumns}
      FROM sys_file
      WHERE storage_key = ?
    `,
    [normalizedKey],
  )

  if (!row) {
    throw new NotFoundError('文件不存在。', { storageKey: normalizedKey })
  }

  return row
}

function normalizeStorageKey(storageKey: string): string {
  const normalizedKey = storageKey
    .replace(/^\/+/, '')
    .replace(/\\/g, '/')

  if (
    !normalizedKey
    || normalizedKey.includes('..')
    || normalizedKey.split('/').some((segment) => !segment)
  ) {
    throw new NotFoundError('文件不存在。', { storageKey })
  }

  return normalizedKey
}

function createStorageKey(
  uploadType: FileUploadType,
  extension: string,
  now: string,
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

function toFileRecord(row: FileEntity): FileRecord {
  return {
    createdAt: row.created_at,
    fileSize: row.file_size,
    id: row.id,
    mimeType: row.mime_type,
    originalName: row.original_name,
    storageKey: row.storage_key,
    storageMode: row.storage_mode,
    updatedAt: row.updated_at,
    uploadType: row.upload_type,
    url: `${fileUrlPrefix}${row.storage_key}`,
    userId: row.user_id,
  }
}
