import type {
  FieldErrors,
  PageAlertState,
  PjaxActionResult,
  PjaxHistoryState,
  VisitOptions,
} from './types'
import {
  applyFormValidationErrors,
  applyNativeFieldValidation,
  clearFormValidationErrors,
  getEventFormField,
  getPjaxFieldForm,
  isFormField,
  validateFieldForEvent,
} from './form-validation'
import {
  restoreRichTextEditorsFromInputs,
  syncRichTextEditors,
} from './rich-text'
import {
  scheduleAlertDismiss,
} from './ui'

const pjaxAlertRootId = 'hono-admin-pjax-alert'
let visitSequence = 0
let pendingPjaxAlert: PageAlertState | null = null
let hydratePjaxContent: () => Promise<void> = async () => {}

interface FormSnapshot {
  checkedValues: Map<string, boolean[]>
  values: Map<string, string[]>
}

export function supportsPjax(): boolean {
  return (
    typeof window.fetch === 'function'
    && typeof window.FormData === 'function'
    && typeof window.DOMParser === 'function'
    && typeof window.CustomEvent === 'function'
    && typeof window.history.pushState === 'function'
    && typeof window.history.replaceState === 'function'
  )
}

export function installPjax(options: { hydrate: () => Promise<void> }) {
  hydratePjaxContent = options.hydrate
  initializePjaxHistory()

  window.addEventListener('hono-admin:pjax-refresh', (event) => {
    event.preventDefault()
    void refreshCurrentPage()
  })

  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return
    }

    const historyBackLink = (event.target as Element | null)
      ?.closest<HTMLAnchorElement>('a[data-history-back="true"]')
    if (historyBackLink && !historyBackLink.target && !historyBackLink.download) {
      event.preventDefault()
      goBackOrVisitFallback(historyBackLink)
      return
    }

    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      'a[data-pjax="true"]',
    )
    if (!link || link.target || link.download) {
      return
    }

    const url = new URL(link.href)
    if (url.origin !== window.location.origin) {
      return
    }

    event.preventDefault()
    void visit(url, {
      replace: getPjaxReplace(link),
    })
  })

  document.addEventListener('submit', (event) => {
    const form = (event.target as Element | null)?.closest<HTMLFormElement>(
      'form[data-pjax="true"]',
    )
    if (!form || form.target) {
      return
    }

    const url = new URL(form.action || window.location.href)
    if (url.origin !== window.location.origin) {
      return
    }

    event.preventDefault()
    void submitForm(form, event)
  })

  document.addEventListener('invalid', (event) => {
    const field = getEventFormField(event)
    const form = field ? getPjaxFieldForm(field) : null

    if (field && form) {
      applyNativeFieldValidation(form, field)
    }
  }, true)

  document.addEventListener('blur', (event) => {
    validateFieldForEvent(event, 'blur')
  }, true)

  document.addEventListener('input', (event) => {
    validateFieldForEvent(event, 'change')
  })

  document.addEventListener('change', (event) => {
    validateFieldForEvent(event, 'change')
  })

  window.addEventListener('popstate', () => {
    void visit(new URL(window.location.href), { replace: true })
  })
}

async function submitForm(
  form: HTMLFormElement,
  event: SubmitEvent,
): Promise<boolean> {
  const method = form.method.toUpperCase()
  const url = new URL(form.action || window.location.href)
  const formData = createFormData(form, event.submitter)
  const snapshot = createFormSnapshot(form, formData)

  if (method === 'GET') {
    return visit(createGetFormUrl(url, formData), {
      replace: getPjaxReplace(form) ?? true,
    })
  }

  if (method !== 'POST') {
    return false
  }

  const sequence = visitSequence + 1
  visitSequence = sequence

  clearFormValidationErrors(form)
  updatePjaxStatus(true, 'refresh')

  let response: Response
  try {
    response = await fetch(url, {
      body: formData,
      headers: {
        'Accept': 'application/json, text/html',
        'X-PJAX': 'true',
      },
      method,
    })
  } catch {
    updatePjaxStatus(false, 'refresh')
    handlePjaxFallback(url, 'navigate')
    return false
  }

  const actionResult = await readPjaxActionResult(response)
  if (actionResult) {
    return handlePjaxActionResult(actionResult, form)
  }

  if (isJsonResponse(response)) {
    updatePjaxStatus(false, 'refresh')
    handlePjaxFallback(new URL(response.url || url.href), 'navigate')
    return false
  }

  const html = await response.text()
  const applied = await applyPjaxResponse(response, html, url, sequence, {
    mode: 'refresh',
    replace: true,
  })

  if (applied && shouldRestoreFormSnapshot(response)) {
    restoreFormSnapshot(snapshot)
  }

  return applied
}

async function readPjaxActionResult(
  response: Response,
): Promise<PjaxActionResult | null> {
  if (!isJsonResponse(response)) {
    return null
  }

  try {
    return normalizePjaxActionResult(await response.json())
  } catch {
    return null
  }
}

function isJsonResponse(response: Response): boolean {
  return response.headers
    .get('Content-Type')
    ?.toLowerCase()
    .includes('application/json') ?? false
}

function normalizePjaxActionResult(value: unknown): PjaxActionResult | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const result = value as Partial<PjaxActionResult>
  if (
    result.honoAdminAction !== true
    || typeof result.ok !== 'boolean'
    || typeof result.target !== 'string'
    || !isPageAlertState(result.alert)
  ) {
    return null
  }

  return {
    alert: result.alert,
    fieldErrors: normalizeFieldErrors(result.fieldErrors),
    formErrors: normalizeStringArray(result.formErrors),
    honoAdminAction: true,
    ok: result.ok,
    replace: typeof result.replace === 'boolean' ? result.replace : true,
    target: result.target,
  }
}

function normalizeFieldErrors(value: unknown): FieldErrors | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const fieldErrors: FieldErrors = {}
  for (const [fieldName, messages] of Object.entries(value)) {
    const normalizedMessages = normalizeStringArray(messages)
    if (normalizedMessages?.length) {
      fieldErrors[fieldName] = normalizedMessages
    }
  }

  return Object.keys(fieldErrors).length ? fieldErrors : undefined
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const messages = value.filter((message): message is string =>
    typeof message === 'string' && message.length > 0
  )
  return messages.length ? messages : undefined
}

function isPageAlertState(value: unknown): value is PageAlertState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const alert = value as Partial<PageAlertState>
  return (
    (alert.type === 'success' || alert.type === 'error')
    && typeof alert.message === 'string'
    && (
      alert.closable === undefined
      || typeof alert.closable === 'boolean'
    )
  )
}

async function handlePjaxActionResult(
  result: PjaxActionResult,
  form: HTMLFormElement,
): Promise<boolean> {
  if (!result.ok) {
    updatePjaxStatus(false, 'refresh')
    applyFormValidationErrors(form, result)
    showPjaxAlert(result.alert)
    return true
  }

  const targetUrl = new URL(result.target, window.location.href)
  const previousUrl = getPreviousActionTargetUrl(targetUrl)

  if (previousUrl) {
    pendingPjaxAlert = result.alert
    updatePjaxStatus(false, 'refresh')
    window.history.back()
    return true
  }

  const visited = await visit(targetUrl, {
    fallback: 'none',
    mode: 'refresh',
    replace: result.replace,
  })

  if (visited) {
    showPjaxAlert(result.alert)
    return true
  }

  handlePjaxFallback(createAlertUrl(targetUrl, result.alert), 'navigate')
  return false
}

async function visit(
  url: URL,
  options: VisitOptions = {},
): Promise<boolean> {
  const sequence = visitSequence + 1
  visitSequence = sequence

  const fallback = options.fallback ?? 'navigate'
  const mode = options.mode ?? 'navigate'
  let response: Response

  updatePjaxStatus(true, mode)

  try {
    response = await fetch(url, {
      headers: {
        'X-PJAX': 'true',
      },
    })
  } catch {
    updatePjaxStatus(false, mode)
    handlePjaxFallback(url, fallback)
    return false
  }

  const html = await response.text()
  return applyPjaxResponse(response, html, url, sequence, options)
}

async function applyPjaxResponse(
  response: Response,
  html: string,
  fallbackUrl: URL,
  sequence: number,
  options: VisitOptions,
): Promise<boolean> {
  if (sequence !== visitSequence) {
    return false
  }

  const documentFragment = new DOMParser().parseFromString(html, 'text/html')
  const nextRoot = documentFragment.querySelector<HTMLElement>('[data-pjax-root]')
  const currentRoot = document.querySelector<HTMLElement>('[data-pjax-root]')

  if (!response.ok || !nextRoot || !currentRoot) {
    pendingPjaxAlert = null
    updatePjaxStatus(false, options.mode ?? 'navigate')
    handlePjaxFallback(
      new URL(response.url || fallbackUrl.href),
      options.fallback ?? 'navigate',
    )
    return false
  }

  document.title = documentFragment.title

  const previousUrl = window.location.href
  const nextUrl = response.url || fallbackUrl.href
  const nextState = createPjaxHistoryState(
    options.replace ? getPjaxHistoryState().previousUrl : previousUrl,
  )

  if (options.replace) {
    window.history.replaceState(nextState, '', nextUrl)
  } else {
    window.history.pushState(nextState, '', nextUrl)
  }

  if (options.scroll !== false) {
    window.scrollTo({ top: 0 })
  }

  window.dispatchEvent(new CustomEvent('hono-admin:pjax-content', {
    detail: {
      currentMenuName: nextRoot.dataset.currentMenuName ?? '',
      html: nextRoot.innerHTML,
    },
  }))
  window.dispatchEvent(new Event('hono-admin:pjax'))
  await nextFrame()
  await hydratePjaxContent()
  updatePjaxStatus(false, options.mode ?? 'navigate')
  showPendingPjaxAlert()

  return true
}

function createFormData(
  form: HTMLFormElement,
  submitter: HTMLElement | null,
): FormData {
  syncRichTextEditors(form)
  const formData = new FormData(form)

  if (
    submitter instanceof HTMLButtonElement
    || submitter instanceof HTMLInputElement
  ) {
    if (submitter.name && !submitter.disabled) {
      formData.append(submitter.name, submitter.value)
    }
  }

  return formData
}

function createFormSnapshot(
  form: HTMLFormElement,
  formData: FormData,
): FormSnapshot {
  const values = new Map<string, string[]>()
  const checkedValues = new Map<string, boolean[]>()

  for (const [name, value] of formData) {
    if (typeof value !== 'string') {
      continue
    }

    const fieldValues = values.get(name) ?? []
    fieldValues.push(value)
    values.set(name, fieldValues)
  }

  for (const field of Array.from(form.elements)) {
    if (
      field instanceof HTMLInputElement
      && (field.type === 'checkbox' || field.type === 'radio')
      && field.name
    ) {
      const fieldValues = checkedValues.get(field.name) ?? []
      fieldValues.push(field.checked)
      checkedValues.set(field.name, fieldValues)
    }
  }

  return { checkedValues, values }
}

function shouldRestoreFormSnapshot(response: Response): boolean {
  try {
    const url = new URL(response.url)
    return (
      url.origin === window.location.origin
      && url.searchParams.get('alert') === 'error'
    )
  } catch {
    return false
  }
}

function restoreFormSnapshot(snapshot: FormSnapshot) {
  const form = document.querySelector<HTMLFormElement>('form[data-pjax="true"]')
  if (!form) {
    return
  }

  const checkedIndexes = new Map<string, number>()
  for (const field of Array.from(form.elements)) {
    if (!isFormField(field) || !field.name) {
      continue
    }

    if (
      field instanceof HTMLInputElement
      && (field.type === 'checkbox' || field.type === 'radio')
    ) {
      const index = checkedIndexes.get(field.name) ?? 0
      field.checked = snapshot.checkedValues.get(field.name)?.[index] ?? false
      checkedIndexes.set(field.name, index + 1)
      continue
    }

    const values = snapshot.values.get(field.name)
    if (values?.[0] !== undefined) {
      field.value = values[0]
    }
  }

  restoreRichTextEditorsFromInputs(form)
}

function createGetFormUrl(url: URL, formData: FormData): URL {
  const nextUrl = new URL(url)
  const searchParams = new URLSearchParams(nextUrl.search)
  const formKeys = new Set<string>()

  for (const [key, value] of formData) {
    if (typeof value === 'string') {
      formKeys.add(key)
    }
  }

  for (const key of formKeys) {
    searchParams.delete(key)
  }

  for (const [key, value] of formData) {
    if (typeof value === 'string' && value !== '') {
      searchParams.append(key, value)
    }
  }

  nextUrl.search = searchParams.toString()
  return nextUrl
}

function getPjaxReplace(
  element: HTMLElement,
): boolean | undefined {
  if (element.dataset.pjaxReplace === 'true') {
    return true
  }

  if (element.dataset.pjaxReplace === 'false') {
    return false
  }

  return undefined
}

function initializePjaxHistory() {
  const state = getPjaxHistoryState()
  if (state.honoAdminPjax) {
    return
  }

  window.history.replaceState(createPjaxHistoryState(), '', window.location.href)
}

function createPjaxHistoryState(previousUrl?: string): PjaxHistoryState {
  return {
    honoAdminPjax: true,
    previousUrl,
  }
}

function getPjaxHistoryState(): PjaxHistoryState {
  const state = window.history.state
  if (!state || typeof state !== 'object') {
    return {}
  }

  return state as PjaxHistoryState
}

function getPreviousActionTargetUrl(targetUrl: URL): URL | null {
  if (window.location.pathname === targetUrl.pathname) {
    return null
  }

  const { previousUrl } = getPjaxHistoryState()
  if (!previousUrl) {
    return null
  }

  try {
    const previous = new URL(previousUrl)
    if (
      previous.origin === window.location.origin
      && previous.pathname === targetUrl.pathname
    ) {
      return previous
    }
  } catch {}

  return null
}

function createAlertUrl(url: URL, alert: PageAlertState): URL {
  const nextUrl = new URL(url.href)
  nextUrl.searchParams.set('alert', alert.type)
  nextUrl.searchParams.set('message', alert.message)

  if (alert.closable !== undefined) {
    nextUrl.searchParams.set('closable', String(alert.closable))
  }

  return nextUrl
}

function showPendingPjaxAlert() {
  if (!pendingPjaxAlert) {
    return
  }

  const alert = pendingPjaxAlert
  pendingPjaxAlert = null
  showPjaxAlert(alert)
}

function showPjaxAlert(alert: PageAlertState) {
  document.getElementById(pjaxAlertRootId)?.remove()

  const root = document.createElement('div')
  root.id = pjaxAlertRootId
  root.className = 'toast toast-top toast-end z-50 pointer-events-none'
  root.dataset.pageAlertRoot = ''

  const alertBox = document.createElement('div')
  alertBox.className = `alert pointer-events-auto max-w-sm shadow-lg ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`
  alertBox.setAttribute('role', 'alert')
  if (alert.closable !== false) {
    alertBox.dataset.pageAlert = 'auto-dismiss'
  }

  const icon = document.createElement('i')
  icon.className = alert.type === 'success'
    ? 'icon-[ri--checkbox-circle-line]'
    : 'icon-[ri--error-warning-line]'

  const message = document.createElement('span')
  message.textContent = alert.message

  alertBox.appendChild(icon)
  alertBox.appendChild(message)

  if (alert.closable !== false) {
    const closeButton = document.createElement('button')
    closeButton.className = 'btn btn-ghost btn-circle btn-xs'
    closeButton.type = 'button'
    closeButton.setAttribute('aria-label', '关闭提示')
    closeButton.addEventListener('click', () => root.remove())

    const closeIcon = document.createElement('i')
    closeIcon.className = 'icon-[ri--close-line]'
    closeButton.appendChild(closeIcon)
    alertBox.appendChild(closeButton)
  }

  root.appendChild(alertBox)
  document.body.appendChild(root)
  if (alert.closable !== false) {
    scheduleAlertDismiss(alertBox)
  }
}

function goBackOrVisitFallback(link: HTMLAnchorElement) {
  const fallbackUrl = new URL(link.href)

  if (shouldUseHistoryBack()) {
    window.history.back()
    return
  }

  void visit(fallbackUrl, {
    replace: true,
  })
}

function shouldUseHistoryBack(): boolean {
  const { previousUrl } = getPjaxHistoryState()

  if (previousUrl && isSameOriginUrl(previousUrl)) {
    return true
  }

  return Boolean(
    document.referrer
    && isSameOriginUrl(document.referrer)
    && document.referrer !== window.location.href,
  )
}

function isSameOriginUrl(value: string): boolean {
  try {
    return new URL(value).origin === window.location.origin
  } catch {
    return false
  }
}

async function refreshCurrentPage() {
  const refreshed = await visit(new URL(window.location.href), {
    fallback: 'none',
    mode: 'refresh',
    replace: true,
    scroll: false,
  })

  if (!refreshed) {
    window.location.reload()
  }
}

function handlePjaxFallback(
  url: URL,
  fallback: 'navigate' | 'none' | 'reload',
) {
  if (fallback === 'reload') {
    window.location.reload()
    return
  }

  if (fallback === 'navigate') {
    window.location.href = url.href
  }
}

function updatePjaxStatus(
  pending: boolean,
  mode: VisitOptions['mode'],
) {
  window.dispatchEvent(new CustomEvent('hono-admin:pjax-status', {
    detail: { mode, pending },
  }))
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}
