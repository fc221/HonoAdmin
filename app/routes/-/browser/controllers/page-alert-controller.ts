import { Controller } from '@hotwired/stimulus'

const pageAlertDelayMs = 3600

export default class PageAlertController extends Controller<HTMLElement> {
  static values = {
    closable: Boolean,
  }

  declare readonly closableValue: boolean

  private timer: number | null = null

  connect() {
    if (this.closableValue) {
      this.timer = window.setTimeout(() => this.close(), pageAlertDelayMs)
    }
  }

  disconnect() {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
    }
  }

  close() {
    this.element.remove()
  }
}
