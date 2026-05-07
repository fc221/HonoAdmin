import type { Context } from 'hono'
import { createRequestOperateLog } from '../../../../service/admin/system/operate-log'
import {
  createRole,
  deleteRole,
  updateRole,
} from '../../../../service/admin/system/role'
import {
  createRoleSchema,
  updateRoleSchema,
} from '../../../../service/admin/system/role/dto'
import { idParamSchema } from '../../../../service/common/response'
import { ValidationError } from '../../../../utils/errors'
import {
  getFormValue,
  getFormValues,
  getNullableFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/system/role'
const createPath = `${pagePath}/add`

export async function handleRoleAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody({ all: true })
  const intent = getFormValue(body, 'intent')

  try {
    if (intent === 'delete') {
      await deleteRole(
        c,
        idParamSchema.parse({ id: getFormValue(body, 'id') }).id,
      )
      await createRequestOperateLog(c, {
        logMsg: '删除角色',
        logType: 'deleteOne',
        method: 'handleRoleAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '角色已删除。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的角色操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}

export async function handleRoleCreateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody({ all: true })

  try {
    const role = await createRole(
      c,
      createRoleSchema.parse(getRoleFormInput(body)),
    )
    await createRequestOperateLog(c, {
      logMsg: '新增角色',
      logType: 'createOne',
      method: 'handleRoleCreateAction',
    })

    return respondWithActionAlert(c, getEditPath(role.id), {
      message: '角色已新增。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, createPath, error)
  }
}

export async function handleRoleUpdateAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody({ all: true })
  let editPath = pagePath

  try {
    const id = idParamSchema.parse({
      id: c.req.query('id') ?? getFormValue(body, 'id'),
    }).id
    editPath = getEditPath(id)
    await updateRole(
      c,
      id,
      updateRoleSchema.parse(getRoleFormInput(body)),
    )
    await createRequestOperateLog(c, {
      logMsg: '更新角色',
      logType: 'updateOne',
      method: 'handleRoleUpdateAction',
    })

    return respondWithActionAlert(c, editPath, {
      message: '角色已更新。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, editPath, error)
  }
}

function getRoleFormInput(body: Record<string, unknown>) {
  return {
    code: getFormValue(body, 'code'),
    description: getNullableFormValue(body, 'description'),
    menuNames: getFormValues(body, 'menuNames'),
    name: getFormValue(body, 'name'),
    permissionCodes: getFormValues(body, 'permissionCodes'),
  }
}

function getEditPath(id: number): string {
  return `${pagePath}/edit?id=${id}`
}
