import type { Context } from 'hono'
import { idParamSchema } from '../../../-/schemas/response'
import {
  getActionReturnPath,
  getFormValue,
  respondWithActionAlert,
  respondWithActionError,
  withReturnToPath,
} from '../../../-/utils/form'
import { createRequestOperateLog } from '../../../../service/admin/system/operate-log'
import {
  createWebNotification,
  deleteWebNotification,
  updateWebNotification,
} from '../../../../service/admin/web/notification'
import {
  createWebNotificationSchema,
  updateWebNotificationSchema,
} from '../../../../service/admin/web/notification/dto'
import { ValidationError } from '../../../../utils/errors'
import { sanitizeRichTextHtml } from '../../../../utils/html'

const pagePath = '/admin/web/notification'
const createPath = `${pagePath}/add`

export async function handleWebNotificationAction(
  c: Context,
): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')
  const returnPath = getActionReturnPath(c, body, pagePath)

  try {
    if (intent === 'create') {
      const notification = await createWebNotification(
        c,
        createWebNotificationSchema.parse(getWebNotificationFormInput(body)),
      )
      await createRequestOperateLog(c, {
        logMsg: '新增公告',
        logType: 'createOne',
        method: 'handleWebNotificationAction',
      })

      return respondWithActionAlert(c, withReturnToPath(getEditPath(notification.id), returnPath), {
        message: '公告已新增。',
        type: 'success',
      })
    }

    if (intent === 'update') {
      const id = idParamSchema.parse({ id: getFormValue(body, 'id') }).id
      await updateWebNotification(
        c,
        id,
        updateWebNotificationSchema.parse(getWebNotificationFormInput(body)),
      )
      await createRequestOperateLog(c, {
        logMsg: '更新公告',
        logType: 'updateOne',
        method: 'handleWebNotificationAction',
      })

      return respondWithActionAlert(c, withReturnToPath(getEditPath(id), returnPath), {
        message: '公告已更新。',
        type: 'success',
      })
    }

    if (intent === 'delete') {
      await deleteWebNotification(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
      )
      await createRequestOperateLog(c, {
        logMsg: '删除公告',
        logType: 'deleteOne',
        method: 'handleWebNotificationAction',
      })

      return respondWithActionAlert(c, returnPath, {
        message: '公告已删除。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的公告操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, returnPath, error)
  }
}

export async function handleWebNotificationCreateAction(
  c: Context,
): Promise<Response> {
  const body = await c.req.parseBody()
  const returnPath = getActionReturnPath(c, body, pagePath)

  try {
    const notification = await createWebNotification(
      c,
      createWebNotificationSchema.parse(getWebNotificationFormInput(body)),
    )
    await createRequestOperateLog(c, {
      logMsg: '新增公告',
      logType: 'createOne',
      method: 'handleWebNotificationCreateAction',
    })

    return respondWithActionAlert(c, withReturnToPath(getEditPath(notification.id), returnPath), {
      message: '公告已新增。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, withReturnToPath(createPath, returnPath), error)
  }
}

export async function handleWebNotificationUpdateAction(
  c: Context,
): Promise<Response> {
  const body = await c.req.parseBody()
  let editPath = pagePath
  const returnPath = getActionReturnPath(c, body, pagePath)

  try {
    const id = idParamSchema.parse({
      id: c.req.query('id') ?? getFormValue(body, 'id'),
    }).id
    editPath = withReturnToPath(getEditPath(id), returnPath)
    await updateWebNotification(
      c,
      id,
      updateWebNotificationSchema.parse(getWebNotificationFormInput(body)),
    )
    await createRequestOperateLog(c, {
      logMsg: '更新公告',
      logType: 'updateOne',
      method: 'handleWebNotificationUpdateAction',
    })

    return respondWithActionAlert(c, editPath, {
      message: '公告已更新。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, editPath, error)
  }
}

function getWebNotificationFormInput(body: Record<string, unknown>) {
  return {
    alias: getFormValue(body, 'alias'),
    content: sanitizeRichTextHtml(getFormValue(body, 'content')),
    isImportant: getFormValue(body, 'isImportant') === 'on',
    isTop: getFormValue(body, 'isTop') === 'on',
    title: getFormValue(body, 'title'),
  }
}

function getEditPath(id: number): string {
  return `${pagePath}/edit?id=${id}`
}
