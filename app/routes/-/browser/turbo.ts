import {
  config,
  session,
} from '@hotwired/turbo'
import {
  refreshPageForExpiredCsrf,
  shouldRefreshForCsrfResponse,
} from './csrf-refresh'

let turboInstalled = false

export function installTurbo() {
  if (turboInstalled) {
    return
  }

  turboInstalled = true
  session.drive = true
  config.forms.mode = 'optin'
  document.addEventListener('turbo:before-fetch-response', refreshExpiredCsrf)
}

function refreshExpiredCsrf(event: Event) {
  const response = (event as CustomEvent<{
    fetchResponse?: {
      response?: Response
    }
  }>).detail?.fetchResponse?.response

  if (!response || !shouldRefreshForCsrfResponse(response)) {
    return
  }

  event.preventDefault()
  refreshPageForExpiredCsrf()
}
