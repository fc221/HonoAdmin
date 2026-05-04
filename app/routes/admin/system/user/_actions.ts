import type { Context } from 'hono'
import {
  createRequestOperateLog,
  createUser,
  createUserSchema,
  deleteUser,
  idParamSchema,
  updateUser,
  updateUserSchema,
} from '../../../../service'
import { ValidationError } from '../../../../utils'
import {
  getFormValue,
  getNullableFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/system/user'

export async function handleUserAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
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
          roleId: getNullableId(body, 'roleId'),
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
          roleId: getNullableId(body, 'roleId'),
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

function getNullableId(
  body: Record<string, unknown>,
  key: string,
): number | null {
  const value = getFormValue(body, key)
  return value ? Number(value) : null
}
