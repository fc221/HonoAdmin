let confirmInstalled = false

export function installConfirm() {
  if (confirmInstalled) {
    return
  }

  confirmInstalled = true

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-confirm]')
      : null
    const message = target?.dataset.confirm

    // eslint-disable-next-line no-alert -- Global confirm behavior intentionally uses the native browser dialog.
    if (message && !window.confirm(message)) {
      event.preventDefault()
    }
  })
}
