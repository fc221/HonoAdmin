const groupSelector = '[data-checkbox-group="true"]'
const groupActionSelector = '[data-checkbox-group-action]'
const groupItemSelector = 'input[type="checkbox"][data-checkbox-group-item="true"]'

let checkboxGroupActionsInstalled = false

export function installCheckboxGroupActions() {
  if (checkboxGroupActionsInstalled) {
    return
  }

  checkboxGroupActionsInstalled = true
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)
      ?.closest<HTMLButtonElement>(groupActionSelector)
    const group = button?.closest<HTMLElement>(groupSelector)

    if (!button || !group) {
      return
    }

    event.preventDefault()
    updateGroupItems(group, button.dataset.checkboxGroupAction)
  })
}

function updateGroupItems(group: HTMLElement, action: string | undefined) {
  const items = [...group.querySelectorAll<HTMLInputElement>(groupItemSelector)]

  for (const item of items) {
    if (action === 'check') {
      item.checked = true
    } else if (action === 'invert') {
      item.checked = !item.checked
    }
  }
}
