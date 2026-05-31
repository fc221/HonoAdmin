import type { Context } from 'hono'
import { idParamSchema } from '../../../-/schemas/response'
import {
  getActionReturnPath,
  getFormValue,
  getNullableFormValue,
  respondWithActionAlert,
  respondWithActionError,
  withReturnToPath,
} from '../../../-/utils/form'
import { createRequestOperateLog } from '../../../../service/admin/system/operate-log'
import {
  createWebPage,
  deleteWebPage,
  updateWebPage,
} from '../../../../service/admin/web/page'
import {
  createWebPageSchema,
  updateWebPageSchema,
} from '../../../../service/admin/web/page/dto'
import { ValidationError } from '../../../../utils/errors'
import { sanitizeRichTextHtml } from '../../../../utils/html'

const pagePath = '/admin/web/page'
const createPath = `${pagePath}/add`

export async function handleWebPageAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')
  const returnPath = getActionReturnPath(c, body, pagePath)

  try {
    if (intent === 'create') {
      const page = await createWebPage(
        c,
        createWebPageSchema.parse(getWebPageFormInput(body)),
      )
      await createRequestOperateLog(c, {
        logMsg: '新增页面',
        logType: 'createOne',
        method: 'handleWebPageAction',
      })

      return respondWithActionAlert(c, withReturnToPath(getEditPath(page.id), returnPath), {
        message: '页面已新增。',
        type: 'success',
      })
    }

    if (intent === 'update') {
      const id = idParamSchema.parse({ id: getFormValue(body, 'id') }).id
      await updateWebPage(
        c,
        id,
        updateWebPageSchema.parse(getWebPageFormInput(body)),
      )
      await createRequestOperateLog(c, {
        logMsg: '更新页面',
        logType: 'updateOne',
        method: 'handleWebPageAction',
      })

      return respondWithActionAlert(c, withReturnToPath(getEditPath(id), returnPath), {
        message: '页面已更新。',
        type: 'success',
      })
    }

    if (intent === 'delete') {
      await deleteWebPage(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
      )
      await createRequestOperateLog(c, {
        logMsg: '删除页面',
        logType: 'deleteOne',
        method: 'handleWebPageAction',
      })

      return respondWithActionAlert(c, returnPath, {
        message: '页面已删除。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的页面操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, returnPath, error)
  }
}

export async function handleWebPageCreateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const returnPath = getActionReturnPath(c, body, pagePath)

  try {
    const page = await createWebPage(
      c,
      createWebPageSchema.parse(getWebPageFormInput(body)),
    )
    await createRequestOperateLog(c, {
      logMsg: '新增页面',
      logType: 'createOne',
      method: 'handleWebPageCreateAction',
    })

    return respondWithActionAlert(c, withReturnToPath(getEditPath(page.id), returnPath), {
      message: '页面已新增。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, withReturnToPath(createPath, returnPath), error)
  }
}

export async function handleWebPageUpdateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  let editPath = pagePath
  const returnPath = getActionReturnPath(c, body, pagePath)

  try {
    const id = idParamSchema.parse({
      id: c.req.query('id') ?? getFormValue(body, 'id'),
    }).id
    editPath = withReturnToPath(getEditPath(id), returnPath)
    await updateWebPage(
      c,
      id,
      updateWebPageSchema.parse(getWebPageFormInput(body)),
    )
    await createRequestOperateLog(c, {
      logMsg: '更新页面',
      logType: 'updateOne',
      method: 'handleWebPageUpdateAction',
    })

    return respondWithActionAlert(c, editPath, {
      message: '页面已更新。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, editPath, error)
  }
}

function getWebPageFormInput(body: Record<string, unknown>) {
  return {
    alias: getFormValue(body, 'alias'),
    category: getNullableFormValue(body, 'category'),
    content: sanitizeRichTextHtml(getFormValue(body, 'content')),
    summary: getNullableFormValue(body, 'summary'),
    title: getFormValue(body, 'title'),
  }
}

function getEditPath(id: number): string {
  return `${pagePath}/edit?id=${id}`
}
