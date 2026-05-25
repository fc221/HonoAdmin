const csrfRefreshDelayMs = 1200
const csrfRefreshHeaderName = 'X-HonoAdmin-CSRF-Refresh'
const csrfRefreshMessage = '页面令牌已过期，正在刷新页面。'

let csrfRefreshScheduled = false

export function shouldRefreshForCsrfResponse(response: Response): boolean {
  return (
    response.status === 403
    && response.headers.get(csrfRefreshHeaderName) === 'true'
  )
}

export function shouldRefreshForCsrfXhr(request: XMLHttpRequest): boolean {
  return (
    request.status === 403
    && request.getResponseHeader(csrfRefreshHeaderName) === 'true'
  )
}

export function refreshPageForExpiredCsrf(): void {
  if (csrfRefreshScheduled) {
    return
  }

  csrfRefreshScheduled = true
  showCsrfRefreshAlert()
  window.setTimeout(() => {
    window.location.reload()
  }, csrfRefreshDelayMs)
}

function showCsrfRefreshAlert(): void {
  document.querySelector('[data-csrf-refresh-alert]')?.remove()

  const toast = document.createElement('div')
  toast.className = 'toast toast-top toast-end z-50 pointer-events-none'
  toast.dataset.csrfRefreshAlert = 'true'

  const alert = document.createElement('div')
  alert.className = 'alert pointer-events-auto max-w-sm shadow-lg alert-error'
  alert.role = 'alert'

  const icon = document.createElement('i')
  icon.className = 'icon-[ri--error-warning-line]'

  const message = document.createElement('span')
  message.textContent = csrfRefreshMessage

  alert.appendChild(icon)
  alert.appendChild(message)
  toast.appendChild(alert)
  document.body.appendChild(toast)
}
