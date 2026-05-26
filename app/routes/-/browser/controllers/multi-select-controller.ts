import { Controller } from '@hotwired/stimulus'

const checkedOptionClass = 'flex min-w-0 cursor-pointer items-center gap-3 rounded-field bg-primary/10 px-3 py-2 text-primary'
const uncheckedOptionClass = 'flex min-w-0 cursor-pointer items-center gap-3 rounded-field px-3 py-2 hover:bg-base-200'

export default class MultiSelectController extends Controller<HTMLElement> {
  static targets = ['check', 'checkbox', 'option', 'summary']

  declare readonly checkTargets: HTMLElement[]
  declare readonly checkboxTargets: HTMLInputElement[]
  declare readonly hasSummaryTarget: boolean
  declare readonly optionTargets: HTMLElement[]
  declare readonly summaryTarget: HTMLElement

  connect() {
    this.sync()
  }

  toggle() {
    this.sync()
  }

  private sync() {
    const selectedLabels: string[] = []

    for (const checkbox of this.checkboxTargets) {
      const checked = checkbox.checked
      const value = checkbox.value
      const option = this.optionTargets.find((item) =>
        item.dataset.multiSelectValue === value
      )
      const check = this.checkTargets.find((item) =>
        item.dataset.multiSelectValue === value
      )

      if (checked) {
        const label = checkbox.dataset.multiSelectLabel ?? ''
        if (label) {
          selectedLabels.push(label)
        }
      }

      if (option) {
        option.className = checked ? checkedOptionClass : uncheckedOptionClass
      }

      check?.classList.toggle('hidden', !checked)
    }

    if (!this.hasSummaryTarget) {
      return
    }

    const placeholder = this.element.querySelector<HTMLElement>(
      '[data-multi-select-placeholder]',
    )?.dataset.multiSelectPlaceholder ?? '请选择'

    this.summaryTarget.textContent = selectedLabels.length
      ? selectedLabels.join('、')
      : placeholder
  }
}
