import type { Context } from 'hono'
import {
  createRequestOperateLog,
  createWebPage,
  createWebPageSchema,
  deleteWebPage,
  idParamSchema,
  updateWebPage,
  updateWebPageSchema,
} from '../../../../service'
import { sanitizeRichTextHtml, ValidationError } from '../../../../utils'
import {
  getFormValue,
  getNullableFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/web/page'
const createPath = `${pagePath}/add`

export async function handleWebPageAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')

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

      return respondWithActionAlert(c, getEditPath(page.id), {
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

      return respondWithActionAlert(c, getEditPath(id), {
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

      return respondWithActionAlert(c, pagePath, {
        message: '页面已删除。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的页面操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}

export async function handleWebPageCreateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()

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

    return respondWithActionAlert(c, getEditPath(page.id), {
      message: '页面已新增。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, createPath, error)
  }
}

export async function handleWebPageUpdateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  let editPath = pagePath

  try {
    const id = idParamSchema.parse({
      id: c.req.query('id') ?? getFormValue(body, 'id'),
    }).id
    editPath = `${pagePath}/edit?id=${id}`
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
