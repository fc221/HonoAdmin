export function installHistoryReplaceNavigation() {
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null
    if (!form?.matches('form[data-history-replace="true"]')) {
      return
    }

    const url = createGetFormUrl(
      form,
      event instanceof SubmitEvent ? event.submitter : null,
    )
    if (!url) {
      return
    }

    event.preventDefault()
    window.location.replace(url.href)
  })

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>('a[data-history-replace="true"]')
      : null
    if (!link || !shouldReplaceLinkNavigation(event, link)) {
      return
    }

    event.preventDefault()
    window.location.replace(link.href)
  })
}

function createGetFormUrl(
  form: HTMLFormElement,
  submitter: HTMLElement | null,
): URL | null {
  const method = (form.getAttribute('method') || 'get').toLowerCase()
  if (method !== 'get') {
    return null
  }

  const url = new URL(form.getAttribute('action') || window.location.href, window.location.href)
  const params = new URLSearchParams()
  const formData = new FormData(form)

  appendSubmitterValue(formData, submitter)

  for (const [key, value] of formData.entries()) {
    params.append(key, String(value))
  }

  url.search = params.toString()
  return url
}

function appendSubmitterValue(
  formData: FormData,
  submitter: HTMLElement | null,
) {
  if (
    !(submitter instanceof HTMLButtonElement)
    && !(submitter instanceof HTMLInputElement)
  ) {
    return
  }

  if (!submitter.name || submitter.disabled || submitter.type === 'image') {
    return
  }

  formData.append(submitter.name, submitter.value)
}

function shouldReplaceLinkNavigation(
  event: MouseEvent,
  link: HTMLAnchorElement,
) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) {
    return false
  }

  const target = link.getAttribute('target')
  if (target && target !== '_self') {
    return false
  }

  return new URL(link.href, window.location.href).origin === window.location.origin
}
