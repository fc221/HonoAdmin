import { createRoute } from 'honox/factory'
import { switchCurrentSessionRole } from '../../service'
import { UnauthorizedError } from '../../utils'
import {
  getFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../_utils/form'

const fallbackPath = '/user/profile'

export const POST = createRoute(async (c) => {
  const body = await c.req.parseBody()

  try {
    const result = await switchCurrentSessionRole(c, {
      roleId: getFormValue(body, 'roleId'),
    })

    return respondWithActionAlert(c, result.target, {
      message: result.message,
      type: 'success',
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return c.redirect('/user/login', 303)
    }

    return respondWithActionError(c, fallbackPath, error)
  }
})

export default createRoute((c) => c.redirect(fallbackPath, 302))
