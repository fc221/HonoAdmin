import { Controller } from '@hotwired/stimulus'

export default class LoginFormController extends Controller<HTMLFormElement> {
  static targets = ['button', 'icon', 'spinner']

  declare readonly buttonTarget: HTMLButtonElement
  declare readonly hasButtonTarget: boolean
  declare readonly hasIconTarget: boolean
  declare readonly hasSpinnerTarget: boolean
  declare readonly iconTarget: HTMLElement
  declare readonly spinnerTarget: HTMLElement

  connect() {
    this.setPending(false)
    window.addEventListener('pageshow', this.reset)
  }

  disconnect() {
    window.removeEventListener('pageshow', this.reset)
  }

  start(event: SubmitEvent) {
    if (event.defaultPrevented) {
      return
    }

    this.setPending(true)
  }

  private reset = () => {
    this.setPending(false)
  }

  private setPending(pending: boolean) {
    if (this.hasButtonTarget) {
      this.buttonTarget.disabled = pending
      this.buttonTarget.setAttribute('aria-busy', pending ? 'true' : 'false')
    }

    if (this.hasIconTarget) {
      this.iconTarget.hidden = pending
    }

    if (this.hasSpinnerTarget) {
      this.spinnerTarget.hidden = !pending
    }
  }
}
