import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { FileRecord } from '../../../../service/admin/system/file/dto'
import type { FileUploadType } from '../../../../service/admin/system/file/enum'
import { getAdminSessionUser } from '../../../../service/admin/session'
import {
  deleteFile,
  uploadFile,
} from '../../../../service/admin/system/file'
import { uploadFileFormSchema } from '../../../../service/admin/system/file/dto'
import { createRequestOperateLog } from '../../../../service/admin/system/operate-log'
import { idParamSchema } from '../../../../service/common/response'
import { toErrorShape, ValidationError } from '../../../../utils/errors'
import {
  getFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/system/file'

export async function handleFileAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody({ all: true })
  const intent = getFormValue(body, 'intent')

  try {
    if (intent === 'upload') {
      const sessionUser = await getAdminSessionUser(c)
      const uploadType = uploadFileFormSchema.parse({
        uploadType: getFormValue(body, 'uploadType'),
      }).uploadType
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
        method: 'handleFileAction',
      })

      if (isFileUploadRequest(c)) {
        const file = uploadedFiles[0]

        return c.json({
          data: {
            id: file.id,
            url: file.url,
          },
          ok: true,
        })
      }

      return respondWithActionAlert(c, pagePath, {
        message: `已上传 ${uploadedFiles.length} 个文件。`,
        type: 'success',
      })
    }

    if (intent === 'delete') {
      const id = idParamSchema.parse({ id: getFormValue(body, 'id') }).id
      await deleteFile(c, id)
      await createRequestOperateLog(c, {
        logData: { fileId: id },
        logMsg: '删除文件',
        logType: 'deleteOne',
        method: 'handleFileAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '文件已删除。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的文件操作。', { intent })
  } catch (error) {
    if (isFileUploadRequest(c)) {
      const errorShape = toErrorShape(error)
      return c.json(
        errorShape.body,
        errorShape.status as ContentfulStatusCode,
      )
    }

    return respondWithActionError(c, pagePath, error)
  }
}

async function uploadFilesFromForm(
  c: Context,
  input: {
    files: File[]
    uploadType: FileUploadType
    userId: number | null
  },
) {
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

function isFileUploadRequest(c: Context): boolean {
  return c.req.header('X-Hono-File-Upload') === 'true'
}
