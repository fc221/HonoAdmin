import { validator } from 'hono-openapi'
import { createRoute } from 'honox/factory'
import { z } from 'zod'
import { requireUserApiToken } from '../-/auth'
import {
  describeApiRoute,
  jsonResponse,
  withApiError,
} from '../-/openapi'
import { userRecordSchema } from '../../../service/admin/system/user/dto'
import {
  getUserProfileById,
  updateUserProfileById,
} from '../../../service/user/profile'
import { userProfileUpdateSchema } from '../../../service/user/profile/dto'

const apiUserResponseSchema = z.object({
  data: userRecordSchema,
  ok: z.literal(true),
})

const apiUserUpdateRequestSchema = userProfileUpdateSchema

export const PUT = createRoute(
  describeApiRoute({
    responses: {
      200: jsonResponse(apiUserResponseSchema, 'Updated user profile.'),
    },
    tags: ['User'],
  }),
  validator('json', apiUserUpdateRequestSchema),
  (c) => withApiError(c, async () => {
    const token = await requireUserApiToken(c)
    const user = await updateUserProfileById(
      c,
      token.user.id,
      c.req.valid('json'),
    )

    c.header('Cache-Control', 'no-store')
    return c.json({
      data: user,
      ok: true,
    })
  }),
)

export default createRoute(
  describeApiRoute({
    responses: {
      200: jsonResponse(apiUserResponseSchema, 'Current user profile.'),
    },
    tags: ['User'],
  }),
  (c) => withApiError(c, async () => {
    const token = await requireUserApiToken(c)

    c.header('Cache-Control', 'no-store')
    return c.json({
      data: await getUserProfileById(c, token.user.id),
      ok: true,
    })
  }),
)
