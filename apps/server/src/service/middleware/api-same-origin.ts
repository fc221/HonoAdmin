import type { AppEnv } from '@hono-admin/runtime'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { ForbiddenError } from '../../utils/errors'

const apiSessionCookieName = 'hono_admin_session'
const unsafeApiMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const apiSameOrigin = createMiddleware<AppEnv>(async (c, next) => {
  if (shouldVerifyApiSameOrigin(c) && !isSameOriginRequest(c)) {
    throw new ForbiddenError('禁止跨站请求。')
  }

  await next()
})

function shouldVerifyApiSameOrigin(c: Context<AppEnv>): boolean {
  return (
    c.req.path.startsWith('/api/')
    && unsafeApiMethods.has(c.req.method.toUpperCase())
    && hasSessionCookie(c.req.header('cookie') ?? '')
  )
}

function hasSessionCookie(cookieHeader: string): boolean {
  return cookieHeader
    .split(';')
    .some((part) => part.trim().startsWith(`${apiSessionCookieName}=`))
}

function isSameOriginRequest(c: Context<AppEnv>): boolean {
  const fetchSite = c.req.header('sec-fetch-site')?.toLowerCase()
  if (fetchSite) {
    return ['same-origin', 'same-site', 'none'].includes(fetchSite)
  }

  const origin = c.req.header('origin')
  if (origin) {
    return hasSameOrigin(c.req.url, origin)
  }

  const referer = c.req.header('referer')
  if (referer) {
    return hasSameOrigin(c.req.url, referer)
  }

  return true
}

function hasSameOrigin(requestUrl: string, sourceUrl: string): boolean {
  try {
    return new URL(requestUrl).origin === new URL(sourceUrl).origin
  } catch {
    return false
  }
}
