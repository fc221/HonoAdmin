let csrfInstalled = false
let csrfRefreshPromise: Promise<string> | null = null
let lastCsrfRefreshAt = 0

const csrfRefreshEndpoint = '/csrf-token'
const csrfRefreshHeaderName = 'X-HonoAdmin-CSRF-Refresh'
const csrfRefreshMaxAgeMs = 5 * 60 * 1000

export function installCsrf() {
  if (csrfInstalled) {
    return
  }

  csrfInstalled = true
  document.addEventListener('submit', ensureFormCsrfToken, true)
  document.addEventListener('turbo:before-fetch-request', addTurboCsrfHeader)
  document.addEventListener('visibilitychange', refreshVisiblePageCsrf)
  window.addEventListener('focus', refreshFocusedPageCsrf)
  void ensureFreshCsrfToken({ force: true }).catch(() => {})
}

export function getCsrfToken(): string {
  return getMetaContent('csrf-token')
}

export function getCsrfHeaderName(): string {
  return getMetaContent('csrf-header') || 'X-HonoAdmin-CSRF'
}

export async function ensureFreshCsrfToken(
  options: { force?: boolean } = {},
): Promise<string> {
  const currentToken = getCsrfToken()
  if (
    !options.force
    && currentToken
    && Date.now() - lastCsrfRefreshAt < csrfRefreshMaxAgeMs
  ) {
    return currentToken
  }

  if (csrfRefreshPromise) {
    return csrfRefreshPromise
  }

  csrfRefreshPromise = fetch(csrfRefreshEndpoint, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      [csrfRefreshHeaderName]: 'true',
    },
  })
    .then(async (response) => {
      const result = await response.json().catch(() => null)
      if (!response.ok || !isCsrfRefreshResult(result)) {
        throw new Error('CSRF token refresh failed.')
      }

      applyCsrfToken(result.csrf)
      lastCsrfRefreshAt = Date.now()
      return result.csrf.token
    })
    .finally(() => {
      csrfRefreshPromise = null
    })

  return csrfRefreshPromise
}

function ensureFormCsrfToken(event: SubmitEvent) {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || !shouldAttachCsrfToForm(form)) {
    return
  }

  attachCsrfTokenToForm(form, getCsrfToken())
}

function attachCsrfTokenToForm(form: HTMLFormElement, token: string) {
  if (!token) {
    return
  }

  const fieldName = getMetaContent('csrf-field') || '_csrf'
  const field = getOrCreateHiddenField(form, fieldName)
  field.value = token
}

function addTurboCsrfHeader(event: Event) {
  const detail = (event as CustomEvent<TurboFetchRequestDetail>).detail

  if (!detail?.fetchOptions || isSafeMethod(detail.fetchOptions.method)) {
    return
  }

  const url = detail.url ?? new URL(window.location.href)
  if (url.origin !== window.location.origin) {
    return
  }

  if (!detail.resume) {
    setTurboCsrfHeader(detail.fetchOptions, getCsrfToken())
    return
  }

  event.preventDefault()

  const fetchOptions = detail.fetchOptions
  void ensureFreshCsrfToken()
    .catch(() => getCsrfToken())
    .then((token) => {
      setTurboCsrfHeader(fetchOptions, token)
      detail.resume?.()
    })
}

interface TurboFetchRequestDetail {
  fetchOptions?: {
    headers?: HeadersInit
    method?: string
  }
  resume?: () => void
  url?: URL
}

function setTurboCsrfHeader(
  fetchOptions: {
    headers?: HeadersInit
    method?: string
  },
  token: string,
) {
  if (!token) {
    return
  }

  const headers = new Headers(fetchOptions.headers)
  headers.set(getCsrfHeaderName(), token)
  fetchOptions.headers = headers
}

function shouldAttachCsrfToForm(form: HTMLFormElement): boolean {
  if (isSafeMethod(form.method)) {
    return false
  }

  return new URL(form.action || window.location.href, window.location.href)
    .origin === window.location.origin
}

function isSafeMethod(method: string | undefined): boolean {
  return ['get', 'head', 'options'].includes((method || 'get').toLowerCase())
}

function getOrCreateHiddenField(
  form: HTMLFormElement,
  fieldName: string,
): HTMLInputElement {
  const existing = form.querySelector<HTMLInputElement>(
    `input[type="hidden"][name="${CSS.escape(fieldName)}"]`,
  )

  if (existing) {
    return existing
  }

  const field = document.createElement('input')
  field.type = 'hidden'
  field.name = fieldName
  form.insertBefore(field, form.firstChild)
  return field
}

function getMetaContent(name: string): string {
  return document
    .querySelector<HTMLMetaElement>(`meta[name="${CSS.escape(name)}"]`)
    ?.content ?? ''
}

function setMetaContent(name: string, value: string): void {
  const meta = document
    .querySelector<HTMLMetaElement>(`meta[name="${CSS.escape(name)}"]`)

  if (meta) {
    meta.content = value
  }
}

function refreshVisiblePageCsrf() {
  if (!document.hidden) {
    void ensureFreshCsrfToken().catch(() => {})
  }
}

function refreshFocusedPageCsrf() {
  void ensureFreshCsrfToken().catch(() => {})
}

interface CsrfRefreshResult {
  csrf: {
    field: string
    header: string
    token: string
  }
  ok: true
}

function isCsrfRefreshResult(value: unknown): value is CsrfRefreshResult {
  const result = value as Partial<CsrfRefreshResult> | null

  return (
    !!result
    && result.ok === true
    && typeof result.csrf?.field === 'string'
    && typeof result.csrf.header === 'string'
    && typeof result.csrf.token === 'string'
    && result.csrf.token.length > 0
  )
}

function applyCsrfToken(csrf: CsrfRefreshResult['csrf']): void {
  const previousFieldName = getMetaContent('csrf-field') || '_csrf'

  setMetaContent('csrf-token', csrf.token)
  setMetaContent('csrf-field', csrf.field)
  setMetaContent('csrf-header', csrf.header)

  const fieldSelector = [
    `input[type="hidden"][name="${CSS.escape(previousFieldName)}"]`,
    `input[type="hidden"][name="${CSS.escape(csrf.field)}"]`,
  ].join(',')

  document.querySelectorAll<HTMLInputElement>(fieldSelector)
    .forEach((field) => {
      field.name = csrf.field
      field.value = csrf.token
    })
}
