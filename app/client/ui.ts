const autoCloseDetailsSelector = 'details[data-auto-close-details="true"]'
const pageAlertSelector = '[data-page-alert="auto-dismiss"]'
const pageAlertDelayMs = 3600

let uiInteractionsInstalled = false
const scheduledAlerts = new WeakSet<HTMLElement>()

export function installUiInteractions() {
  if (uiInteractionsInstalled) {
    initializePageAlerts()
    return
  }

  uiInteractionsInstalled = true
  document.addEventListener('pointerdown', closeDetailsOnOutsidePointer)
  document.addEventListener('click', closeDetailsAfterNavigationClick)
  document.addEventListener('keydown', closeDetailsOnEscape)
  window.addEventListener('hono-admin:pjax', initializePageAlerts)
  initializePageAlerts()
}

export function initializePageAlerts() {
  document
    .querySelectorAll<HTMLElement>(pageAlertSelector)
    .forEach(scheduleAlertDismiss)
}

export function scheduleAlertDismiss(alert: HTMLElement) {
  if (scheduledAlerts.has(alert)) {
    return
  }

  scheduledAlerts.add(alert)
  window.setTimeout(() => {
    const root = alert.closest<HTMLElement>('[data-page-alert-root]')
    if (root) {
      root.remove()
      return
    }

    alert.remove()
  }, pageAlertDelayMs)
}

function closeDetailsOnOutsidePointer(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) {
    return
  }

  document
    .querySelectorAll<HTMLDetailsElement>(`${autoCloseDetailsSelector}[open]`)
    .forEach((details) => {
      if (!details.contains(target)) {
        details.open = false
      }
    })
}

function closeDetailsAfterNavigationClick(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a')
  const details = link?.closest<HTMLDetailsElement>(autoCloseDetailsSelector)

  if (details && !link?.target && !link?.download) {
    details.open = false
  }
}

function closeDetailsOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') {
    return
  }

  document
    .querySelectorAll<HTMLDetailsElement>(`${autoCloseDetailsSelector}[open]`)
    .forEach((details) => {
      details.open = false
    })
}
