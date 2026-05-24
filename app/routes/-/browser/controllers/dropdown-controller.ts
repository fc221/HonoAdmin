import { Controller } from '@hotwired/stimulus'

export default class DropdownController extends Controller<HTMLElement> {
  static targets = ['button', 'menu']

  declare readonly buttonTargets: HTMLElement[]
  declare readonly menuTargets: HTMLElement[]

  connect() {
    document.addEventListener('pointerdown', this.closeOnOutsidePointer)
    document.addEventListener('keydown', this.closeOnEscape)
  }

  disconnect() {
    document.removeEventListener('pointerdown', this.closeOnOutsidePointer)
    document.removeEventListener('keydown', this.closeOnEscape)
  }

  toggle(event: Event) {
    event.preventDefault()
    const key = (event.currentTarget as HTMLElement).dataset.dropdownKey
    if (!key) {
      return
    }

    const willOpen = !this.isOpen(key)
    this.closeAll()

    if (willOpen) {
      this.setOpen(key, true)
    }
  }

  closeAll() {
    for (const menu of this.menuTargets) {
      const key = menu.dataset.dropdownKey
      if (key) {
        this.setOpen(key, false)
      }
    }
  }

  private closeOnOutsidePointer = (event: PointerEvent) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (
      this.element.contains(target)
      && (
        target.closest('[data-dropdown-target="button"]')
        || target.closest('[data-dropdown-target="menu"]')
      )
    ) {
      return
    }

    this.closeAll()
  }

  private closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.closeAll()
    }
  }

  private isOpen(key: string) {
    return this.menuTargets.some((menu) =>
      menu.dataset.dropdownKey === key && !menu.hidden
    )
  }

  private setOpen(key: string, open: boolean) {
    for (const button of this.buttonTargets) {
      if (button.dataset.dropdownKey === key) {
        button.setAttribute('aria-expanded', open ? 'true' : 'false')
      }
    }

    for (const menu of this.menuTargets) {
      if (menu.dataset.dropdownKey === key) {
        menu.hidden = !open
      }
    }
  }
}
