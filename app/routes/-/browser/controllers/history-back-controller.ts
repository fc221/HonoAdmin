import { Controller } from '@hotwired/stimulus'

export default class HistoryBackController extends Controller<HTMLAnchorElement> {
  go(event: Event) {
    if (!canUseHistoryBack()) {
      return
    }

    event.preventDefault()
    window.history.back()
  }
}

function canUseHistoryBack(): boolean {
  if (window.history.length <= 1) {
    return false
  }

  if (!document.referrer) {
    return false
  }

  try {
    return new URL(document.referrer).origin === window.location.origin
  } catch {
    return false
  }
}
