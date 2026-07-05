import { describe, expect, test } from 'bun:test'
import { isAppHandledPath } from '../apps/server/src/entry/static'

describe('static entry routing', () => {
  test('dynamic public pages are handled by the Hono app before static fallback', () => {
    expect(isAppHandledPath('/api/health')).toBe(true)
    expect(isAppHandledPath('/uploads/page/a.png')).toBe(true)
    expect(isAppHandledPath('/page/about-us')).toBe(true)
    expect(isAppHandledPath('/admin/web/page')).toBe(false)
  })
})
