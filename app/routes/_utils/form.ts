import type { Context } from 'hono'
import type { PageAlertState } from '../_components/_page-alert'
import { ZodError } from 'zod'
import { AppError, toErrorShape } from '../../utils'

type FormBody = Record<string, unknown>
type FieldErrors = Record<string, string[]>

export interface PjaxActionResult {
  alert: PageAlertState
  fieldErrors?: FieldErrors
  formErrors?: string[]
  honoAdminAction: true
  ok: boolean
  replace: boolean
  target: string
}

interface ActionAlertOptions {
  fieldErrors?: FieldErrors
  formErrors?: string[]
  replace?: boolean
}

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

export function getPageAlert(c: Context): PageAlertState | undefined {
  const type = c.req.query('alert')
  const message = c.req.query('message')
  const closable = normalizeBooleanQuery(c.req.query('closable'))

  if ((type === 'success' || type === 'error') && message) {
    return { closable, message, type }
  }

  return undefined
}

export function redirectWithAlert(
  c: Context,
  path: string,
  alert: PageAlertState,
): Response {
  const query = new URLSearchParams({
    alert: alert.type,
    message: alert.message,
  })

  if (alert.closable !== undefined) {
    query.set('closable', String(alert.closable))
  }

  return c.redirect(`${path}${path.includes('?') ? '&' : '?'}${query}`, 303)
}

export function respondWithActionAlert(
  c: Context,
  path: string,
  alert: PageAlertState,
  options: ActionAlertOptions = {},
): Response {
  if (!isPjaxRequest(c)) {
    return redirectWithAlert(c, path, alert)
  }

  const status = alert.type === 'error' ? 422 : 200
  return c.json<PjaxActionResult>({
    alert,
    fieldErrors: options.fieldErrors,
    formErrors: options.formErrors,
    honoAdminAction: true,
    ok: alert.type === 'success',
    replace: options.replace ?? true,
    target: path,
  }, status)
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
  }, {
    fieldErrors: actionError.fieldErrors,
    formErrors: actionError.formErrors,
  })
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

function isPjaxRequest(c: Context): boolean {
  return c.req.header('X-PJAX') === 'true'
}

function normalizeBooleanQuery(value: string | undefined): boolean | undefined {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}
