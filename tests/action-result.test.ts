import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import {
  getActionReturnPath,
  getPageAlert,
  respondWithActionAlert,
  respondWithActionError,
  returnToFieldName,
} from '../app/routes/-/utils/form'
import { updateUserSchema } from '../app/service/admin/system/user/dto'
import { createWebNotificationSchema } from '../app/service/admin/web/notification/dto'
import { pageAlertCookieName } from '../app/service/common/page-alert'

function createActionTestApp() {
  const app = new Hono()

  app.post('/notification', (c) => {
    try {
      createWebNotificationSchema.parse({
        alias: 'bad alias',
        content: '',
        title: '',
      })
      return respondWithActionAlert(c, '/admin/web/notification', {
        message: '创建成功。',
        type: 'success',
      })
    } catch (error) {
      return respondWithActionError(
        c,
        '/admin/web/notification/add',
        error,
      )
    }
  })

  app.post('/empty-update', (c) => {
    try {
      updateUserSchema.parse({})
      return respondWithActionAlert(c, '/admin/system/user', {
        message: '保存成功。',
        type: 'success',
      })
    } catch (error) {
      return respondWithActionError(c, '/admin/system/user', error)
    }
  })

  app.post('/success', (c) =>
    respondWithActionAlert(c, '/admin/web/page/edit?id=1', {
      message: '创建成功。',
      type: 'success',
    }))

  app.post('/delete-page', async (c) => {
    const body = await c.req.parseBody()
    return respondWithActionAlert(
      c,
      getActionReturnPath(c, body, '/admin/web/page'),
      {
        message: '删除成功。',
        type: 'success',
      },
    )
  })

  app.get('/read-alert', (c) => {
    const first = getPageAlert(c)
    const second = getPageAlert(c)

    return c.json({
      first: first ?? null,
      second: second ?? null,
    })
  })

  return app
}

describe('action redirect result', () => {
  test('redirects validation failures with a flash alert and clean location', async () => {
    const response = await createActionTestApp().request('/notification', {
      method: 'POST',
    })
    const location = response.headers.get('Location') ?? ''

    expect(response.status).toBe(303)
    expect(location).toBe('/admin/web/notification/add')
    expect(getFlashAlert(response)).toMatchObject({
      type: 'error',
    })
    expect(getFlashAlert(response).message).toContain(
      '公告别名只能包含字母、数字、下划线、点和横线。',
    )
  })

  test('redirects root validation failures with a flash alert and clean location', async () => {
    const response = await createActionTestApp().request('/empty-update', {
      method: 'POST',
    })
    const location = response.headers.get('Location') ?? ''

    expect(response.status).toBe(303)
    expect(location).toBe('/admin/system/user')
    expect(getFlashAlert(response)).toMatchObject({
      type: 'error',
    })
    expect(getFlashAlert(response).message).toContain(
      'At least one user field is required.',
    )
  })

  test('redirects success actions with a flash alert and clean location', async () => {
    const response = await createActionTestApp().request('/success', {
      method: 'POST',
    })
    const location = response.headers.get('Location') ?? ''

    expect(response.status).toBe(303)
    expect(location).toBe('/admin/web/page/edit?id=1')
    expect(getFlashAlert(response)).toEqual({
      message: '创建成功。',
      type: 'success',
    })
  })

  test('preserves list return path for actions inside paginated lists', async () => {
    const response = await createActionTestApp().request('/delete-page', {
      body: new URLSearchParams({
        [returnToFieldName]: '/admin/web/page?keyword=hello&page=2&pageSize=20',
      }),
      method: 'POST',
    })

    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe(
      '/admin/web/page?keyword=hello&page=2&pageSize=20',
    )
  })

  test('ignores legacy query alert parameters', async () => {
    const response = await createActionTestApp().request(
      '/read-alert?alert=success&message=legacy',
    )
    const body = await response.json()

    expect(body).toEqual({
      first: null,
      second: null,
    })
  })

  test('uses redirects for action failures', async () => {
    const response = await createActionTestApp().request('/notification', {
      method: 'POST',
    })

    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toBe('/admin/web/notification/add')
    expect(response.headers.get('Set-Cookie')).toContain(pageAlertCookieName)
  })

  test('reads a flash alert once while keeping duplicate render calls stable', async () => {
    const app = createActionTestApp()
    const actionResponse = await app.request('/success', {
      method: 'POST',
    })
    const cookie = getFlashCookiePair(actionResponse)
    const response = await app.request('/read-alert', {
      headers: {
        Cookie: cookie,
      },
    })
    const body = await response.json()

    expect(body).toEqual({
      first: {
        message: '创建成功。',
        type: 'success',
      },
      second: {
        message: '创建成功。',
        type: 'success',
      },
    })
    expect(response.headers.get('Set-Cookie')).toContain(
      `${pageAlertCookieName}=`,
    )
  })
})

function getFlashAlert(response: Response): {
  closable?: boolean
  message: string
  type: string
} {
  const cookieValue = getCookieValue(
    response.headers.get('Set-Cookie') ?? '',
    pageAlertCookieName,
  )

  expect(cookieValue).not.toBe('')
  return parseFlashCookie(cookieValue)
}

function getFlashCookiePair(response: Response): string {
  const setCookie = response.headers.get('Set-Cookie') ?? ''
  const value = getCookieValue(setCookie, pageAlertCookieName)

  expect(value).not.toBe('')
  return `${pageAlertCookieName}=${value}`
}

function getCookieValue(setCookie: string, name: string): string {
  const cookie = setCookie
    .split(';')
    .find((part) => part.trim().startsWith(`${name}=`))

  return cookie?.trim().slice(name.length + 1).replace(/^"|"$/g, '') ?? ''
}

function parseFlashCookie(value: string): {
  closable?: boolean
  message: string
  type: string
} {
  const candidates = [value]
  let current = value

  for (let index = 0; index < 2; index += 1) {
    const decoded = decodeURIComponent(current)
    if (decoded === current) {
      break
    }
    candidates.push(decoded)
    current = decoded
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      continue
    }
  }

  throw new Error('Flash alert cookie did not contain JSON.')
}
