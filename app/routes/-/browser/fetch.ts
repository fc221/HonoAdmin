import {
  ensureFreshCsrfToken,
  getCsrfHeaderName,
  getCsrfToken,
} from './csrf'
import {
  refreshPageForExpiredCsrf,
  shouldRefreshForCsrfResponse,
} from './csrf-refresh'

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (shouldAttachCsrfToRequest(input, init)) {
    const token = await ensureFreshCsrfToken()
      .catch(() => getCsrfToken())

    if (token) {
      headers.set(getCsrfHeaderName(), token)
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (shouldRefreshForCsrfFailure(response)) {
    refreshPageForExpiredCsrf()
    throw new Error('页面令牌已过期，正在刷新页面。')
  }

  const result = await response.json().catch(() => null) as T | null
  if (!response.ok || result === null) {
    throw new Error('请求失败，请稍后重试。')
  }

  return result
}

function shouldRefreshForCsrfFailure(response: Response): boolean {
  return shouldRefreshForCsrfResponse(response)
}

function shouldAttachCsrfToRequest(
  input: RequestInfo | URL,
  init: RequestInit,
): boolean {
  if (isSafeMethod(getRequestMethod(input, init))) {
    return false
  }

  return getRequestUrl(input).origin === window.location.origin
}

function getRequestMethod(
  input: RequestInfo | URL,
  init: RequestInit,
): string {
  if (init.method) {
    return init.method
  }

  return input instanceof Request ? input.method : 'GET'
}

function getRequestUrl(input: RequestInfo | URL): URL {
  if (input instanceof Request) {
    return new URL(input.url)
  }

  return new URL(input, window.location.href)
}

function isSafeMethod(method: string | undefined): boolean {
  return ['get', 'head', 'options'].includes((method || 'get').toLowerCase())
}
