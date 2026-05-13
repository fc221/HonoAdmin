import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { jsxRenderer } from 'hono/jsx-renderer'
import errorHandler from '../app/routes/_error'

describe('error page rendering', () => {
  test('does not render inside the current admin or user layout', async () => {
    const app = new Hono()
    const originalConsoleError = console.error

    app.use('*', jsxRenderer(({ children, ...options }) => {
      if (options.layout === false) {
        return <html><body>{children}</body></html>
      }

      return <html><body><div data-layout="true">{children}</div></body></html>
    }))
    app.onError(errorHandler)
    app.get('/user/login', () => {
      throw new Error('failed to execute D1 first')
    })

    console.error = () => {}
    try {
      const response = await app.request('/user/login')
      const html = await response.text()

      expect(response.status).toBe(500)
      expect(html).toContain('服务暂时不可用')
      expect(html).not.toContain('data-layout="true"')
    } finally {
      console.error = originalConsoleError
    }
  })
})
