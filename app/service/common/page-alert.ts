import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export interface PageAlertState {
  closable?: boolean
  message: string
  type: 'error' | 'success'
}

export const pageAlertCookieName = 'hono_admin_page_alert'

const pageAlertCookiePath = '/'
const pageAlertMaxAgeSeconds = 60
const pageAlertCache = new WeakMap<Context, PageAlertState | undefined>()

export function getPageAlert(c: Context): PageAlertState | undefined {
  if (pageAlertCache.has(c)) {
    return pageAlertCache.get(c)
  }

  const alert = getFlashPageAlert(c)
  pageAlertCache.set(c, alert)
  return alert
}

export function setPageAlert(
  c: Context,
  alert: PageAlertState,
): void {
  const normalizedAlert = normalizePageAlert(
    alert.type,
    alert.message,
    alert.closable,
  )

  if (!normalizedAlert) {
    return
  }

  setCookie(c, pageAlertCookieName, serializePageAlertCookie(normalizedAlert), {
    httpOnly: true,
    maxAge: pageAlertMaxAgeSeconds,
    path: pageAlertCookiePath,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
  })
}

function getFlashPageAlert(c: Context): PageAlertState | undefined {
  const value = getCookie(c, pageAlertCookieName)

  if (!value) {
    return undefined
  }

  deleteCookie(c, pageAlertCookieName, {
    path: pageAlertCookiePath,
  })
  return parsePageAlertCookie(value)
}

function parsePageAlertCookie(value: string): PageAlertState | undefined {
  for (const candidate of getCookieDecodeCandidates(value)) {
    try {
      const parsed = JSON.parse(candidate) as {
        closable?: unknown
        message?: unknown
        type?: unknown
      }
      return normalizePageAlert(
        parsed.type,
        parsed.message,
        typeof parsed.closable === 'boolean' ? parsed.closable : undefined,
      )
    } catch {
      continue
    }
  }

  return undefined
}

function serializePageAlertCookie(alert: PageAlertState): string {
  return JSON.stringify(alert)
}

function getCookieDecodeCandidates(value: string): string[] {
  const candidates = [value]
  let current = value

  for (let index = 0; index < 2; index += 1) {
    try {
      const decoded = decodeURIComponent(current)
      if (decoded === current) {
        break
      }
      candidates.push(decoded)
      current = decoded
    } catch {
      break
    }
  }

  return candidates
}

function normalizePageAlert(
  type: unknown,
  message: unknown,
  closable?: boolean,
): PageAlertState | undefined {
  if (
    (type === 'success' || type === 'error')
    && typeof message === 'string'
    && message
  ) {
    return { closable, message, type }
  }

  return undefined
}
