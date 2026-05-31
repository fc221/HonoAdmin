import { createRoute } from 'honox/factory'
import { requireUserApiToken } from '../-/auth'
import {
  describeApiRoute,
  jsonResponse,
  withApiError,
} from '../-/openapi'
import { apiOkResponseSchema } from '../-/schemas'
import { logoutUserWithApiToken } from '../../../service/user/api-token'

export const POST = createRoute(
  describeApiRoute({
    responses: {
      200: jsonResponse(apiOkResponseSchema, 'Logged out.'),
    },
    tags: ['User'],
  }),
  (c) => withApiError(c, async () => {
    const token = await requireUserApiToken(c)
    await logoutUserWithApiToken(c, token)

    c.header('Cache-Control', 'no-store')
    return c.json({ ok: true })
  }),
)
