import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '../../../infra/runtime/types'
import { Hono } from 'hono'
import {
  describeRoute,
  resolver,
  validator,
} from 'hono-openapi'
import { bearerAuth } from 'hono/bearer-auth'
import { verifyAdminBearerToken } from '../../../service/admin/auth'
import {
  createConfig,
  deleteConfig,
  listConfigs,
  updateConfig,
} from '../../../service/admin/system/config'
import {
  configListResponseSchema,
  configResponseSchema,
  createConfigSchema,
  updateConfigSchema,
} from '../../../service/admin/system/config/dto'
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '../../../service/admin/system/user'
import {
  createUserSchema,
  listUserSchema,
  updateUserSchema,
  userListResponseSchema,
  userResponseSchema,
} from '../../../service/admin/system/user/dto'
import {
  deletedResponseSchema,
  errorResponseSchema,
  idParamSchema,
} from '../../../service/common/response'
import { toErrorShape } from '../../../utils/errors'

const app = new Hono<AppEnv>()

const authResponses = {
  401: {
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
    description: 'Unauthorized.',
  },
}

app.onError((error, c) => {
  if ('getResponse' in error) {
    return error.getResponse()
  }

  const { body, status } = toErrorShape(error)
  return c.json(body, status as ContentfulStatusCode)
})

app.use('*', bearerAuth({
  invalidToken: {
    message: {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid bearer token.',
      },
      ok: false,
    },
  },
  noAuthenticationHeader: {
    message: {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token.',
      },
      ok: false,
    },
  },
  realm: 'hono-admin',
  verifyToken: verifyAdminBearerToken,
}))

app.get(
  '/configs',
  describeRoute({
    responses: {
      200: {
        content: {
          'application/json': {
            schema: resolver(configListResponseSchema),
          },
        },
        description: 'Config list.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Configs'],
  }),
  async (c) => c.json({
    data: await listConfigs(c),
    ok: true,
  }),
)

app.post(
  '/configs',
  describeRoute({
    responses: {
      201: {
        content: {
          'application/json': {
            schema: resolver(configResponseSchema),
          },
        },
        description: 'Created config.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Configs'],
  }),
  validator('json', createConfigSchema),
  async (c) => c.json({
    data: await createConfig(
      c,
      c.req.valid('json'),
    ),
    ok: true,
  }, 201),
)

app.put(
  '/configs/:id',
  describeRoute({
    responses: {
      200: {
        content: {
          'application/json': {
            schema: resolver(configResponseSchema),
          },
        },
        description: 'Updated config.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Configs'],
  }),
  validator('param', idParamSchema),
  validator('json', updateConfigSchema),
  async (c) => c.json({
    data: await updateConfig(
      c,
      c.req.valid('param').id,
      c.req.valid('json'),
    ),
    ok: true,
  }),
)

app.delete(
  '/configs/:id',
  describeRoute({
    responses: {
      200: {
        content: {
          'application/json': {
            schema: resolver(deletedResponseSchema),
          },
        },
        description: 'Deleted config.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Configs'],
  }),
  validator('param', idParamSchema),
  async (c) => {
    await deleteConfig(c, c.req.valid('param').id)
    return c.json({ ok: true })
  },
)

app.get(
  '/users',
  describeRoute({
    responses: {
      200: {
        content: {
          'application/json': {
            schema: resolver(userListResponseSchema),
          },
        },
        description: 'User list.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Users'],
  }),
  validator('query', listUserSchema),
  async (c) => c.json({
    data: await listUsers(c, c.req.valid('query')),
    ok: true,
  }),
)

app.post(
  '/users',
  describeRoute({
    responses: {
      201: {
        content: {
          'application/json': {
            schema: resolver(userResponseSchema),
          },
        },
        description: 'Created user.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Users'],
  }),
  validator('json', createUserSchema),
  async (c) => c.json({
    data: await createUser(
      c,
      c.req.valid('json'),
    ),
    ok: true,
  }, 201),
)

app.put(
  '/users/:id',
  describeRoute({
    responses: {
      200: {
        content: {
          'application/json': {
            schema: resolver(userResponseSchema),
          },
        },
        description: 'Updated user.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Users'],
  }),
  validator('param', idParamSchema),
  validator('json', updateUserSchema),
  async (c) => c.json({
    data: await updateUser(
      c,
      c.req.valid('param').id,
      c.req.valid('json'),
    ),
    ok: true,
  }),
)

app.delete(
  '/users/:id',
  describeRoute({
    responses: {
      200: {
        content: {
          'application/json': {
            schema: resolver(deletedResponseSchema),
          },
        },
        description: 'Deleted user.',
      },
      ...authResponses,
    },
    security: [{ bearerAuth: [] }],
    tags: ['Users'],
  }),
  validator('param', idParamSchema),
  async (c) => {
    await deleteUser(c, c.req.valid('param').id)
    return c.json({ ok: true })
  },
)

export default app
