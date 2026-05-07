import type { Context } from 'hono'
import { getAdminSessionUser } from '../../../service/admin/session'
import {
  updateCurrentUserPassword,
  updateCurrentUserProfile,
} from '../../../service/user/profile'
import { ValidationError } from '../../../utils/errors'
import {
  getFormValue,
  getNullableFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../_utils/form'

const pagePath = '/user/profile'
const passwordPagePath = '/user/profile?tab=password'

export async function handleProfileAction(c: Context): Promise<Response> {
  const sessionUser = await getAdminSessionUser(c)

  if (!sessionUser) {
    return c.redirect('/user/login', 303)
  }

  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')

  try {
    if (intent === 'password') {
      await updateCurrentUserPassword(c, {
        confirmPassword: getFormValue(body, 'confirmPassword'),
        oldPassword: getFormValue(body, 'oldPassword'),
        password: getFormValue(body, 'password'),
      })

      return respondWithActionAlert(c, passwordPagePath, {
        message: '密码已修改。',
        type: 'success',
      })
    }

    if (intent !== 'profile') {
      throw new ValidationError('未知的个人中心操作。', { intent })
    }

    await updateCurrentUserProfile(c, {
      avatar: getNullableFormValue(body, 'avatar'),
      bio: getNullableFormValue(body, 'bio'),
      gender: getNullableFormValue(body, 'gender'),
      nickname: getNullableFormValue(body, 'nickname'),
      username: getFormValue(body, 'username'),
    })

    return respondWithActionAlert(c, pagePath, {
      message: '个人信息已更新。',
      type: 'success',
    })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}
