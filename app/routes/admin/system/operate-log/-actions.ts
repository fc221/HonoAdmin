import type { Context } from 'hono'
import {
  getActionReturnPath,
  getFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../-/utils/form'
import {
  clearOperateLogs,
  createRequestOperateLog,
  deleteOperateLog,
} from '../../../../service/admin/system/operate-log'
import { idParamSchema } from '../../../../service/common/response'
import { ValidationError } from '../../../../utils/errors'

const pagePath = '/admin/system/operate-log'

export async function handleOperateLogAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')
  const returnPath = getActionReturnPath(c, body, pagePath)

  try {
    if (intent === 'delete') {
      await deleteOperateLog(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
      )

      return respondWithActionAlert(c, returnPath, {
        message: '日志已删除。',
        type: 'success',
      })
    }

    if (intent === 'clear') {
      const total = await clearOperateLogs(c)
      await createRequestOperateLog(c, {
        logMsg: `清空操作日志，共 ${total} 条`,
        logType: 'empty',
        method: 'handleOperateLogAction',
      })

      return respondWithActionAlert(c, returnPath, {
        message: '操作日志已清空。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的日志操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, returnPath, error)
  }
}
