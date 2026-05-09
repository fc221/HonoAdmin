import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import {
  respondWithActionAlert,
  respondWithActionError,
} from '../app/routes/_utils/form'
import { updateUserSchema } from '../app/service/admin/system/user/dto'
import { createWebNotificationSchema } from '../app/service/admin/web/notification/dto'

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

  return app
}

describe('action redirect result', () => {
  test('redirects validation failures with an alert query', async () => {
    const response = await createActionTestApp().request('/notification', {
      method: 'POST',
    })
    const location = response.headers.get('Location') ?? ''

    expect(response.status).toBe(303)
    expect(location).toContain('/admin/web/notification/add?alert=error')
    expect(getRedirectMessage(location)).toContain(
      '公告别名只能包含字母、数字、下划线、点和横线。',
    )
  })

  test('redirects root validation failures with an alert query', async () => {
    const response = await createActionTestApp().request('/empty-update', {
      method: 'POST',
    })
    const location = response.headers.get('Location') ?? ''

    expect(response.status).toBe(303)
    expect(location).toContain('/admin/system/user?alert=error')
    expect(getRedirectMessage(location)).toContain(
      'At least one user field is required.',
    )
  })

  test('redirects success actions with an alert query', async () => {
    const response = await createActionTestApp().request('/success', {
      method: 'POST',
    })
    const location = response.headers.get('Location') ?? ''

    expect(response.status).toBe(303)
    expect(location).toContain('/admin/web/page/edit?id=1&alert=success')
    expect(getRedirectMessage(location)).toBe('创建成功。')
  })

  test('uses redirects for action failures', async () => {
    const response = await createActionTestApp().request('/notification', {
      method: 'POST',
    })

    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toContain(
      '/admin/web/notification/add?alert=error',
    )
  })
})

function getRedirectMessage(location: string): string {
  return new URL(location, 'http://localhost').searchParams.get('message') ?? ''
}
