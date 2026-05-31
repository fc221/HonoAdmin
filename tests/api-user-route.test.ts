import type { AppEnv } from '../app/infra/runtime/types'
import type { TestServiceContext } from './helpers/service-context'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import userProfileRoute, { PUT as userProfilePutRoute } from '../app/routes/api/user'
import { POST as userLoginPostRoute } from '../app/routes/api/user/login'
import { POST as userLogoutPostRoute } from '../app/routes/api/user/logout'
import { createUser } from '../app/service/admin/system/user'
import { UserStatus } from '../app/service/admin/system/user/enum'
import { createTestServiceContext } from './helpers/service-context'

let testContext: TestServiceContext

beforeEach(async () => {
  testContext = await createTestServiceContext()
})

afterEach(async () => {
  await testContext.cleanup()
})

describe('user API route', () => {
  test('logs in, reads the current user, updates profile, and logs out', async () => {
    await createUser(testContext.ctx, {
      isRoot: true,
      nickname: 'Root',
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'root',
    })
    const app = createUserApiTestApp(testContext.ctx)

    const loginResponse = await app.request('/api/user/login', {
      body: JSON.stringify({
        password: 'secret123',
        remember: true,
        username: 'root',
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
    const loginBody = await loginResponse.json() as UserLoginApiResponse
    const authorization = `Bearer ${loginBody.data.accessToken}`

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.headers.get('cache-control')).toBe('no-store')
    expect(loginBody.ok).toBe(true)
    expect(loginBody.data.tokenType).toBe('Bearer')
    expect(loginBody.data.user.username).toBe('root')
    expect(loginBody.data.accessToken).toContain('.')

    const profileResponse = await app.request('/api/user', {
      headers: { authorization },
    })
    const profileBody = await profileResponse.json() as UserProfileApiResponse

    expect(profileResponse.status).toBe(200)
    expect(profileBody.data.username).toBe('root')

    const updateResponse = await app.request('/api/user', {
      body: JSON.stringify({
        avatar: null,
        bio: 'API profile',
        gender: 'other',
        nickname: 'API Root',
        username: 'root',
      }),
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      method: 'PUT',
    })
    const updateBody = await updateResponse.json() as UserProfileApiResponse

    expect(updateResponse.status).toBe(200)
    expect(updateBody.data.nickname).toBe('API Root')
    expect(updateBody.data.bio).toBe('API profile')

    const logoutResponse = await app.request('/api/user/logout', {
      headers: { authorization },
      method: 'POST',
    })
    const logoutBody = await logoutResponse.json() as { ok: boolean }

    expect(logoutResponse.status).toBe(200)
    expect(logoutBody.ok).toBe(true)

    const revokedProfileResponse = await app.request('/api/user', {
      headers: { authorization },
    })
    const revokedProfileBody = await revokedProfileResponse.json() as {
      error: { message: string }
      ok: boolean
    }

    expect(revokedProfileResponse.status).toBe(401)
    expect(revokedProfileBody.error.message).toBe(
      'API 访问令牌已失效。',
    )
  })

  test('returns JSON 401 when the profile endpoint has no bearer token', async () => {
    const response = await createUserApiTestApp(testContext.ctx).request(
      '/api/user',
    )
    const body = await response.json() as {
      error: { code: string, message: string }
      ok: boolean
    }

    expect(response.status).toBe(401)
    expect(body.ok).toBe(false)
    expect(body.error.message).toBe('缺少 API 访问令牌。')
  })
})

interface UserLoginApiResponse {
  data: {
    accessToken: string
    expiresAt: number
    tokenType: 'Bearer'
    user: {
      bio: null | string
      nickname: null | string
      username: string
    }
  }
  ok: boolean
}

interface UserProfileApiResponse {
  data: {
    bio: null | string
    nickname: null | string
    username: string
  }
  ok: boolean
}

function createUserApiTestApp(ctx: TestServiceContext['ctx']) {
  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    Object.assign(c, ctx)
    await next()
  })
  app.get('/api/user', ...userProfileRoute)
  app.put('/api/user', ...userProfilePutRoute)
  app.post('/api/user/login', ...userLoginPostRoute)
  app.post('/api/user/logout', ...userLogoutPostRoute)

  return app
}
