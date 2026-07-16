import type { PaginatedResult } from '../../../common/pagination'
import type { ServiceContext } from '../../../types'
import type {
  FileRecord,
  ListFileInput,
} from './dto'
import type { FileEntity } from './entity'
import type { FileUploadType } from './enum'
import { createFileStorageAdapter } from '@hono-admin/file-storage/factory'
import { NotFoundError, ValidationError } from '../../../../utils/errors'
import {
  createPaginatedResult,
  getPaginationOffset,
  resolvePagination,
} from '../../../common/pagination'
import {
  buildKeywordCondition,
  buildWhereClause,
} from '../../../common/query'
import { listFileSchema } from './dto'
import { fileUploadTypes } from './enum'
import { resolveFileStorageConfig } from './storage-config'
import { createStorageKey, normalizeUploadedFile } from './upload'

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

  const normalizedFile = await normalizeUploadedFile(
    input.file,
    ctx.config.security.maxUploadImageSizeBytes,
  )
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
    const fileId = await ctx.db.insertAndGetId(
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

    return getFileById(ctx, fileId)
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
