let csrfInstalled = false

export function installCsrf() {
  if (csrfInstalled) {
    return
  }

  csrfInstalled = true
  document.addEventListener('submit', ensureFormCsrfToken, true)
  document.addEventListener('turbo:before-fetch-request', addTurboCsrfHeader)
}

export function getCsrfToken(): string {
  return getMetaContent('csrf-token')
}

export function getCsrfHeaderName(): string {
  return getMetaContent('csrf-header') || 'X-HonoAdmin-CSRF'
}

function ensureFormCsrfToken(event: SubmitEvent) {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || !shouldAttachCsrfToForm(form)) {
    return
  }

  const token = getCsrfToken()
  if (!token) {
    return
  }

  const fieldName = getMetaContent('csrf-field') || '_csrf'
  const field = getOrCreateHiddenField(form, fieldName)
  field.value = token
}

function addTurboCsrfHeader(event: Event) {
  const detail = (event as CustomEvent<{
    fetchOptions?: {
      headers?: HeadersInit
      method?: string
    }
    url?: URL
  }>).detail

  if (!detail?.fetchOptions || isSafeMethod(detail.fetchOptions.method)) {
    return
  }

  const url = detail.url ?? new URL(window.location.href)
  if (url.origin !== window.location.origin) {
    return
  }

  const token = getCsrfToken()
  if (!token) {
    return
  }

  const headers = new Headers(detail.fetchOptions.headers)
  headers.set(getCsrfHeaderName(), token)
  detail.fetchOptions.headers = headers
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
