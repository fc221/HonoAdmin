import { Controller } from '@hotwired/stimulus'

export default class RolePermissionController extends Controller<HTMLElement> {
  check(event: Event) {
    event.preventDefault()
    this.setValues(event.currentTarget as HTMLElement, true)
  }

  invert(event: Event) {
    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    const name = target.dataset.rolePermissionName
    const values = getValues(target)
    if (!name) {
      return
    }

    for (const checkbox of this.getCheckboxes(name, values)) {
      checkbox.checked = !checkbox.checked
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  private setValues(target: HTMLElement, checked: boolean) {
    const name = target.dataset.rolePermissionName
    const values = getValues(target)
    if (!name) {
      return
    }

    for (const checkbox of this.getCheckboxes(name, values)) {
      checkbox.checked = checked
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  private getCheckboxes(name: string, values: string[]) {
    const selectedValues = new Set(values)
    return Array.from(
      this.element.querySelectorAll<HTMLInputElement>(
        `input[type="checkbox"][name="${name}"]`,
      ),
    ).filter((checkbox) => selectedValues.has(checkbox.value))
  }
}

function getValues(target: HTMLElement) {
  return (target.dataset.rolePermissionValues ?? '')
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
}
