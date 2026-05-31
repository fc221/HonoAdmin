import type { AppEnv } from '../../infra/runtime/types'
import { swaggerUI } from '@hono/swagger-ui'
import { Hono } from 'hono'
import { openAPIRouteHandler } from 'hono-openapi'
import { apiDocumentation } from './-/openapi'
import userProfileRoute, { PUT as userProfilePutRoute } from './user'
import { POST as userLoginPostRoute } from './user/login'
import { POST as userLogoutPostRoute } from './user/logout'

const documentedApi = new Hono<AppEnv>()
documentedApi.get('/user', ...userProfileRoute)
documentedApi.put('/user', ...userProfilePutRoute)
documentedApi.post('/user/login', ...userLoginPostRoute)
documentedApi.post('/user/logout', ...userLogoutPostRoute)

const app = new Hono<AppEnv>()

app.get('/', (c) => c.json({
  data: {
    docs: '/api/docs',
    openapi: '/api/openapi.json',
  },
  ok: true,
}))

app.get('/openapi.json', openAPIRouteHandler(documentedApi, {
  documentation: apiDocumentation,
}))

app.get('/docs', swaggerUI({ url: '/api/openapi.json' }))

export default app
