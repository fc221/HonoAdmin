import { Controller } from '@hotwired/stimulus'

const baseOptionClass = 'flex min-w-0 cursor-pointer items-center gap-3 rounded-field px-3 py-2 hover:bg-base-200'

export default class RoleMultiSelectController extends Controller<HTMLElement> {
  static targets = ['check', 'checkbox', 'option', 'summary']

  declare readonly checkTargets: HTMLElement[]
  declare readonly checkboxTargets: HTMLInputElement[]
  declare readonly optionTargets: HTMLElement[]
  declare readonly summaryTarget: HTMLElement

  connect() {
    this.sync()
  }

  toggle() {
    this.sync()
  }

  private sync() {
    const selectedNames: string[] = []

    for (const checkbox of this.checkboxTargets) {
      const checked = checkbox.checked
      const option = this.optionTargets.find((item) =>
        item.dataset.roleId === checkbox.value
      )
      const check = this.checkTargets.find((item) =>
        item.dataset.roleId === checkbox.value
      )

      if (checked) {
        selectedNames.push(checkbox.dataset.roleName ?? '')
      }

      if (option) {
        option.className = checked
          ? `${baseOptionClass} bg-primary/10 text-primary`
          : baseOptionClass
      }

      check?.classList.toggle('hidden', !checked)
    }

    this.summaryTarget.textContent = selectedNames.length
      ? selectedNames.filter(Boolean).join('、')
      : '请选择角色'
  }
}
