import type { Context } from 'hono'
import type { PageAlertState } from '../components/page-alert'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { ZodError } from 'zod'
import { AppError, toErrorShape } from '../../../utils/errors'

type FormBody = Record<string, unknown>
type FieldErrors = Record<string, string[]>

const pageAlertCookieName = 'hono_admin_page_alert'
const pageAlertCookiePath = '/'
const pageAlertMaxAgeSeconds = 60
const pageAlertCache = new WeakMap<Context, PageAlertState | undefined>()
export const returnToFieldName = '_returnTo'

export function getFormValue(body: FormBody, key: string): string {
  const value = body[key]

  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

export function getFormValues(body: FormBody, key: string): string[] {
  const value = body[key]

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string') {
    return [value]
  }

  return []
}

export function getNullableFormValue(
  body: FormBody,
  key: string,
): string | null {
  const value = getFormValue(body, key).trim()
  return value || null
}

export function getActionReturnPath(
  c: Context,
  body: FormBody,
  fallbackPath: string,
): string {
  return (
    normalizeReturnPath(c, getFormValue(body, returnToFieldName), fallbackPath)
    ?? normalizeReturnPath(c, getRequestPath(c), fallbackPath)
    ?? normalizeReturnPath(c, c.req.header('referer') ?? '', fallbackPath)
    ?? fallbackPath
  )
}

export function getQueryReturnPath(c: Context, fallbackPath: string): string {
  return normalizeReturnPath(c, c.req.query('returnTo') ?? '', fallbackPath)
    ?? fallbackPath
}

export function withReturnToPath(path: string, returnTo: string): string {
  if (!returnTo) {
    return path
  }

  const url = new URL(path, 'http://hono-admin.local')
  url.searchParams.set('returnTo', returnTo)
  return `${url.pathname}${url.search}`
}

export function getPageAlert(c: Context): PageAlertState | undefined {
  if (pageAlertCache.has(c)) {
    return pageAlertCache.get(c)
  }

  const alert = getFlashPageAlert(c)
  pageAlertCache.set(c, alert)
  return alert
}

export function redirectWithAlert(
  c: Context,
  path: string,
  alert: PageAlertState,
): Response {
  setPageAlert(c, alert)
  return c.redirect(path, 303)
}

function getRequestPath(c: Context): string {
  const url = new URL(c.req.url)
  return `${url.pathname}${url.search}`
}

function normalizeReturnPath(
  c: Context,
  value: string,
  fallbackPath: string,
): string | null {
  if (!value) {
    return null
  }

  try {
    const requestUrl = new URL(c.req.url)
    const url = new URL(value, requestUrl)
    const fallbackUrl = new URL(fallbackPath, requestUrl)

    if (url.origin !== requestUrl.origin || url.pathname !== fallbackUrl.pathname) {
      return null
    }

    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

export function respondWithActionAlert(
  c: Context,
  path: string,
  alert: PageAlertState,
): Response {
  return redirectWithAlert(c, path, alert)
}

export function respondWithActionError(
  c: Context,
  path: string,
  error: unknown,
): Response {
  const actionError = getActionError(error)

  return respondWithActionAlert(c, path, {
    message: actionError.message,
    type: 'error',
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

export function getActionErrorMessage(error: unknown): string {
  return getActionError(error).message
}

function getActionError(error: unknown): {
  fieldErrors?: FieldErrors
  formErrors?: string[]
  message: string
} {
  if (error instanceof ZodError) {
    const fieldErrors: FieldErrors = {}
    const formErrors: string[] = []

    for (const issue of error.issues) {
      const message = issue.message || '提交参数不正确。'
      const fieldName = issue.path.length
        ? issue.path.map(String).join('.')
        : ''

      if (fieldName) {
        const messages = fieldErrors[fieldName] ?? []
        messages.push(message)
        fieldErrors[fieldName] = messages
      } else {
        formErrors.push(message)
      }
    }

    const firstFieldError = Object.values(fieldErrors)[0]?.[0]
    return {
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
      formErrors: formErrors.length ? formErrors : undefined,
      message: formErrors[0] ?? firstFieldError ?? '提交参数不正确。',
    }
  }

  if (error instanceof AppError) {
    const details = normalizeActionErrorDetails(error.details)
    const firstFieldError = details.fieldErrors
      ? Object.values(details.fieldErrors)[0]?.[0]
      : undefined
    return {
      fieldErrors: details.fieldErrors,
      formErrors: details.formErrors,
      message: details.formErrors?.[0] ?? firstFieldError ?? error.message,
    }
  }

  return { message: toErrorShape(error).body.error.message }
}

function normalizeActionErrorDetails(details: unknown): {
  fieldErrors?: FieldErrors
  formErrors?: string[]
} {
  if (!details || typeof details !== 'object') {
    return {}
  }

  const value = details as {
    fieldErrors?: unknown
    formErrors?: unknown
  }

  return {
    fieldErrors: normalizeFieldErrors(value.fieldErrors),
    formErrors: normalizeStringArray(value.formErrors),
  }
}

function normalizeFieldErrors(value: unknown): FieldErrors | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const fieldErrors: FieldErrors = {}

  for (const [field, messages] of Object.entries(value)) {
    const normalizedMessages = normalizeStringArray(messages)
    if (normalizedMessages?.length) {
      fieldErrors[field] = normalizedMessages
    }
  }

  return Object.keys(fieldErrors).length ? fieldErrors : undefined
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const values = value.filter((item): item is string => typeof item === 'string')
  return values.length ? values : undefined
}

export function selectedOptionAttrs(condition: boolean): Record<string, 'selected'> {
  return condition ? { selected: 'selected' } : {}
}

export function checkedOptionAttrs(condition: boolean): Record<string, 'checked'> {
  return condition ? { checked: 'checked' } : {}
}
