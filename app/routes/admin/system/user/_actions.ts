import type { Context } from 'hono'
import { createRequestOperateLog } from '../../../../service/admin/system/operate-log'
import {
  createUser,
  deleteUser,
  updateUser,
} from '../../../../service/admin/system/user'
import {
  createUserSchema,
  updateUserSchema,
} from '../../../../service/admin/system/user/dto'
import { idParamSchema } from '../../../../service/common/response'
import { ValidationError } from '../../../../utils/errors'
import {
  getFormValue,
  getFormValues,
  getNullableFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/system/user'

export async function handleUserAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody({ all: true })
  const intent = getFormValue(body, 'intent')

  try {
    if (intent === 'create') {
      await createUser(
        c,
        createUserSchema.parse({
          avatar: getNullableFormValue(body, 'avatar'),
          isRoot: false,
          mail: getNullableFormValue(body, 'mail'),
          nickname: getNullableFormValue(body, 'nickname'),
          password: getFormValue(body, 'password'),
          phone: getNullableFormValue(body, 'phone'),
          roleIds: getRoleIds(body),
          status: getFormValue(body, 'status'),
          username: getFormValue(body, 'username'),
        }),
      )
      await createRequestOperateLog(c, {
        logMsg: '新增用户',
        logType: 'createOne',
        method: 'handleUserAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '用户已新增。',
        type: 'success',
      })
    }

    if (intent === 'update') {
      const password = getFormValue(body, 'password')
      await updateUser(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
        updateUserSchema.parse({
          avatar: getNullableFormValue(body, 'avatar'),
          mail: getNullableFormValue(body, 'mail'),
          nickname: getNullableFormValue(body, 'nickname'),
          password: password || undefined,
          phone: getNullableFormValue(body, 'phone'),
          roleIds: getRoleIds(body),
          status: getFormValue(body, 'status'),
          username: getFormValue(body, 'username'),
        }),
      )
      await createRequestOperateLog(c, {
        logMsg: '更新用户',
        logType: 'updateOne',
        method: 'handleUserAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '用户已更新。',
        type: 'success',
      })
    }

    if (intent === 'delete') {
      await deleteUser(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
      )
      await createRequestOperateLog(c, {
        logMsg: '删除用户',
        logType: 'deleteOne',
        method: 'handleUserAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '用户已删除。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的用户操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}

function getRoleIds(
  body: Record<string, unknown>,
): number[] {
  return getFormValues(body, 'roleIds')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
}
