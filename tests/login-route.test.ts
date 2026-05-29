import type { TestServiceContext } from './helpers/service-context'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { html } from 'hono/html'
import { jsxRenderer } from 'hono/jsx-renderer'
import userLoginRoute, { POST as userLoginPostRoute } from '../app/routes/user/login'
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

describe('user login route', () => {
  test('redirects login failures with alert and username flash state', async () => {
    await createUser(testContext.ctx, {
      isRoot: true,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'root',
    })

    const response = await createLoginTestApp(testContext.ctx).request(
      '/user/login',
      {
        body: new URLSearchParams({
          password: 'wrong-password',
          remember: 'on',
          returnTo: '/admin/dashboard',
          username: 'root',
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      },
    )

    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      '/user/login?returnTo=%2Fadmin%2Fdashboard',
    )
    expect(setCookie).toContain('hono_admin_page_alert=')
    expect(setCookie).toContain('hono_admin_login_form=')
    expect(setCookie).toContain('root')
    expect(setCookie).not.toContain('wrong-password')
  })

  test('renders login alert and restores username without restoring password', async () => {
    const loginState = encodeURIComponent(JSON.stringify({
      remember: true,
      username: 'root',
    }))
    const alert = encodeURIComponent(JSON.stringify({
      message: '账号或密码不正确。',
      type: 'error',
    }))

    const response = await createLoginTestApp(testContext.ctx).request(
      '/user/login',
      {
        headers: {
          cookie: [
            `hono_admin_login_form=${loginState}`,
            `hono_admin_page_alert=${alert}`,
          ].join('; '),
        },
      },
    )
    const content = await response.text()

    expect(response.status).toBe(200)
    expect(content).toContain('账号或密码不正确。')
    expect(content).toContain('name="username"')
    expect(content).toContain('value="root"')
    expect(content).toContain('name="password"')
    expect(content).not.toContain('wrong-password')
  })

  test('redirects successful native login to the return target', async () => {
    await createUser(testContext.ctx, {
      isRoot: true,
      password: 'secret123',
      status: UserStatus.NORMAL,
      username: 'root',
    })

    const response = await createLoginTestApp(testContext.ctx).request(
      '/user/login',
      {
        body: new URLSearchParams({
          password: 'secret123',
          returnTo: '/admin/dashboard',
          username: 'root',
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      },
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/admin/dashboard')
    expect(response.headers.get('set-cookie')).toContain('hono_admin_session=')
  })
})

function createLoginTestApp(ctx: TestServiceContext['ctx']) {
  const app = new Hono()

  app.use('*', async (c, next) => {
    Object.assign(c, ctx)
    await next()
  })
  app.use('*', jsxRenderer(({ children, ...options }) => {
    if (options.layout === false) {
      return html`<html><body>${children}</body></html>`
    }

    return html`<html><body><div data-layout="true">${children}</div></body></html>`
  }))
  app.get('/user/login', ...userLoginRoute)
  app.post('/user/login', ...userLoginPostRoute)

  return app
}
