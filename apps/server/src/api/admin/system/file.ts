import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import type { FileRecord } from '../../../service/admin/system/file/dto'
import type { FileUploadType } from '../../../service/admin/system/file/enum'
import type { ResourceMutation } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  deleteFile,
  listFiles,
  uploadFile,
} from '../../../service/admin/system/file'
import { uploadFileFormSchema } from '../../../service/admin/system/file/dto'
import { fileUploadTypeOptions } from '../../../service/admin/system/file/enum'
import { createRequestOperateLog } from '../../../service/admin/system/operate-log'
import { ValidationError } from '../../../utils/errors'
import { resourceMutationSchema } from '../../schema'
import {
  deleteAction,
  deleteResource,
  listInput,
  listResource,
  resourceId,
  uploadAction,
} from '../../shared/resource'
import { getOptionalSessionUser } from '../../shared/session'

const fileResource: ResourceDefinition = {
  actions: [uploadAction],
  columns: [
    ['id', 'ID'],
    ['url', '预览'],
    ['originalName', '文件名'],
    ['storageKey', '存储键'],
    ['uploadType', '上传类型'],
    ['storageMode', '存储'],
    ['mimeType', '类型'],
    ['fileSize', '大小'],
    ['userId', '上传用户'],
    ['createdAt', '上传时间'],
  ],
  createFields: fileUploadFields,
  delete: deleteFile,
  list: (c) => listFiles(c, {
    ...listInput(c),
    uploadType: normalizeFileUploadType(c.req.query('uploadType')),
  }),
  rowActions: [deleteAction],
  title: '文件管理',
}

const systemFileApi = new Hono<AppEnv>()

systemFileApi.get('/', async (c) => c.json(await listResource(fileResource, c)))
systemFileApi.post('/upload', async (c) => c.json(await uploadSystemFiles(c)))
systemFileApi.delete('/:id', async (c) => c.json(await deleteResource(fileResource, c, resourceId(c))))

export default systemFileApi

function fileUploadFields() {
  return [
    { key: 'uploadType', label: '上传类型', options: fileUploadTypeOptions, required: true, type: 'select' as const },
    { help: '支持 JPG、PNG、WEBP、GIF，可多选。', key: 'file', label: '上传文件', required: true, type: 'upload' as const },
  ]
}

function normalizeFileUploadType(value: string | undefined): FileUploadType | '' {
  return fileUploadTypeOptions.some((option) => option.value === value)
    ? value as FileUploadType
    : ''
}

async function uploadSystemFiles(c: Context<AppEnv>): Promise<ResourceMutation> {
  const body = await c.req.parseBody({ all: true })
  const uploadType = uploadFileFormSchema.parse({
    uploadType: getFormString(body, 'uploadType'),
  }).uploadType
  const sessionUser = await getOptionalSessionUser(c)
  const uploadedFiles = await uploadFilesFromForm(c, {
    files: getFileFormValues(body, 'file'),
    uploadType,
    userId: sessionUser?.id ?? null,
  })

  await createRequestOperateLog(c, {
    logData: {
      fileIds: uploadedFiles.map((file) => file.id),
      uploadType,
    },
    logMsg: '上传文件',
    logType: 'createOne',
    method: 'uploadSystemFiles',
    userId: sessionUser?.id ?? null,
  })

  return resourceMutationSchema.parse({
    data: {
      files: uploadedFiles.map(toUploadResult),
      uploadedCount: uploadedFiles.length,
    },
    message: `已上传 ${uploadedFiles.length} 个文件。`,
    ok: true,
  })
}

async function uploadFilesFromForm(
  c: Context<AppEnv>,
  input: {
    files: File[]
    uploadType: FileUploadType
    userId: number | null
  },
): Promise<FileRecord[]> {
  const uploadedFiles: FileRecord[] = []

  try {
    for (const file of input.files) {
      uploadedFiles.push(await uploadFile(c, {
        file,
        uploadType: input.uploadType,
        userId: input.userId,
      }))
    }

    return uploadedFiles
  } catch (error) {
    await Promise.all(
      uploadedFiles.map((file) => deleteFile(c, file.id).catch(() => {})),
    )
    throw error
  }
}

function getFileFormValues(body: Record<string, unknown>, key: string): File[] {
  const value = body[key]

  if (Array.isArray(value)) {
    const files = value.filter((item): item is File => item instanceof File)
    if (files.length) {
      return files
    }
  }

  if (value instanceof File) {
    return [value]
  }

  throw new ValidationError('请选择要上传的图片。', { field: key })
}

function getFormString(body: Record<string, unknown>, key: string): string {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

function toUploadResult(file: FileRecord): Record<string, unknown> {
  return {
    fileSize: file.fileSize,
    id: file.id,
    mimeType: file.mimeType,
    originalName: file.originalName,
    url: file.url,
  }
}
