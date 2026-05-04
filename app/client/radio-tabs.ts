export function initializeRadioTabs() {
  document.querySelectorAll<HTMLElement>('.tabs').forEach((tabs) => {
    const groups = new Map<string, HTMLInputElement[]>()

    Array.from(tabs.children).forEach((child) => {
      if (
        !(child instanceof HTMLInputElement)
        || child.type !== 'radio'
        || !child.name
        || !child.classList.contains('tab')
      ) {
        return
      }

      const radios = groups.get(child.name) ?? []
      radios.push(child)
      groups.set(child.name, radios)
    })

    for (const radios of groups.values()) {
      if (radios.length > 0 && !radios.some((radio) => radio.checked)) {
        radios[0].checked = true
      }
    }
  })
}
