import { Controller } from '@hotwired/stimulus'

export default class ModalController extends Controller<HTMLElement> {
  close(event: Event) {
    if (document.documentElement.dataset.spaActionPending === 'true') {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}
