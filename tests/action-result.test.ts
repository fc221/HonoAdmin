import type { PjaxActionResult } from '../app/routes/_utils/form'
import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import {
  respondWithActionAlert,
  respondWithActionError,
} from '../app/routes/_utils/form'
import {
  createWebNotificationSchema,
  updateUserSchema,
} from '../app/service'

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
    }, {
      replace: true,
    }))

  return app
}

describe('PJAX action result', () => {
  test('returns field errors for PJAX validation failure', async () => {
    const response = await createActionTestApp().request('/notification', {
      headers: { 'X-PJAX': 'true' },
      method: 'POST',
    })
    const result = await response.json() as PjaxActionResult

    expect(response.status).toBe(422)
    expect(result.honoAdminAction).toBe(true)
    expect(result.ok).toBe(false)
    expect(result.target).toBe('/admin/web/notification/add')
    expect(result.fieldErrors?.alias).toEqual([
      '公告别名只能包含字母、数字、下划线、点和横线。',
    ])
    expect(result.fieldErrors?.content).toEqual(['请输入公告内容。'])
    expect(result.fieldErrors?.title).toEqual(['请输入公告标题。'])
  })

  test('returns form errors for root validation failure', async () => {
    const response = await createActionTestApp().request('/empty-update', {
      headers: { 'X-PJAX': 'true' },
      method: 'POST',
    })
    const result = await response.json() as PjaxActionResult

    expect(response.status).toBe(422)
    expect(result.fieldErrors).toBeUndefined()
    expect(result.formErrors).toEqual(['At least one user field is required.'])
  })

  test('returns structured success result for PJAX success', async () => {
    const response = await createActionTestApp().request('/success', {
      headers: { 'X-PJAX': 'true' },
      method: 'POST',
    })
    const result = await response.json() as PjaxActionResult

    expect(response.status).toBe(200)
    expect(result.ok).toBe(true)
    expect(result.replace).toBe(true)
    expect(result.target).toBe('/admin/web/page/edit?id=1')
  })

  test('falls back to 303 redirect without PJAX header', async () => {
    const response = await createActionTestApp().request('/notification', {
      method: 'POST',
    })

    expect(response.status).toBe(303)
    expect(response.headers.get('Location')).toContain(
      '/admin/web/notification/add?alert=error',
    )
  })
})
