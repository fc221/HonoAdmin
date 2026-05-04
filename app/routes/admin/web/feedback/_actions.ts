import type { Context } from 'hono'
import {
  createRequestOperateLog,
  deleteWebFeedback,
  idParamSchema,
  updateWebFeedback,
  updateWebFeedbackSchema,
} from '../../../../service'
import { ValidationError } from '../../../../utils'
import {
  getFormValue,
  getNullableFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/web/feedback'

export async function handleWebFeedbackAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')

  try {
    if (intent === 'update') {
      await updateWebFeedback(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
        updateWebFeedbackSchema.parse({
          reply: getNullableFormValue(body, 'reply'),
          status: getFormValue(body, 'status'),
        }),
      )
      await createRequestOperateLog(c, {
        logMsg: '处理用户反馈',
        logType: 'updateOne',
        method: 'handleWebFeedbackAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '反馈已更新。',
        type: 'success',
      })
    }

    if (intent === 'delete') {
      await deleteWebFeedback(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
      )
      await createRequestOperateLog(c, {
        logMsg: '删除用户反馈',
        logType: 'deleteOne',
        method: 'handleWebFeedbackAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '反馈已删除。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的反馈操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}
