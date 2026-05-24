let loadingInstalled = false
let loadingTimeout: number | null = null

export function installLoadingBar() {
  if (loadingInstalled) {
    return
  }

  loadingInstalled = true

  document.addEventListener('turbo:before-visit', startLoading)
  document.addEventListener('turbo:before-fetch-request', startFetchLoading)
  document.addEventListener('turbo:submit-start', startLoading)
  document.addEventListener('turbo:before-cache', stopLoading)
  document.addEventListener('turbo:load', stopLoading)
  document.addEventListener('turbo:render', stopLoading)
  document.addEventListener('turbo:frame-load', stopLoading)
  document.addEventListener('turbo:fetch-request-error', stopLoading)
  document.addEventListener('turbo:submit-end', stopLoading)
}

function startLoading() {
  clearLoadingTimeout()
  document.documentElement.dataset.spaActionPending = 'true'
  loadingTimeout = window.setTimeout(stopLoading, 8000)
}

function startFetchLoading(event: Event) {
  if (isPrefetchRequest(event)) {
    return
  }

  startLoading()
}

function stopLoading() {
  clearLoadingTimeout()
  delete document.documentElement.dataset.spaActionPending
}

function clearLoadingTimeout() {
  if (loadingTimeout !== null) {
    window.clearTimeout(loadingTimeout)
    loadingTimeout = null
  }
}

function isPrefetchRequest(event: Event): boolean {
  const detail = (event as CustomEvent<{
    fetchOptions?: {
      headers?: HeadersInit
    }
  }>).detail
  const headers = new Headers(detail?.fetchOptions?.headers)

  return headers.get('X-Sec-Purpose') === 'prefetch'
}
