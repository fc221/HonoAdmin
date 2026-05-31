let passwordVisibilityInstalled = false

const passwordToggleReadyAttr = 'data-password-toggle-ready'
const passwordToggleButtonAttr = 'data-password-toggle-button'

export function installPasswordVisibility() {
  if (passwordVisibilityInstalled) {
    return
  }

  passwordVisibilityInstalled = true
  enhancePasswordInputs()

  document.addEventListener('turbo:load', () => enhancePasswordInputs())
  document.addEventListener('turbo:frame-load', () => enhancePasswordInputs())

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
      enhancePasswordInputs()
    }
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}

function enhancePasswordInputs(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLInputElement>(`input[type="password"]:not([${passwordToggleReadyAttr}])`)
    .forEach(enhancePasswordInput)
}

function enhancePasswordInput(input: HTMLInputElement) {
  input.setAttribute(passwordToggleReadyAttr, 'true')
  input.classList.add('pr-12')

  const parent = input.parentElement
  if (!parent) {
    return
  }

  const button = createPasswordToggleButton(input)

  if (parent.classList.contains('input')) {
    button.className = 'btn btn-ghost btn-circle btn-xs -mr-2 shrink-0 text-base-content/45 hover:text-base-content'
    input.insertAdjacentElement('afterend', button)
    return
  }

  const wrapper = parent.classList.contains('relative')
    ? parent
    : wrapPasswordInput(input)

  button.className = 'btn btn-ghost btn-circle btn-xs absolute right-2 top-1/2 -translate-y-1/2 text-base-content/45 hover:text-base-content'
  wrapper.appendChild(button)
}

function wrapPasswordInput(input: HTMLInputElement): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'relative w-full'
  input.insertAdjacentElement('beforebegin', wrapper)
  wrapper.appendChild(input)
  return wrapper
}

function createPasswordToggleButton(input: HTMLInputElement): HTMLButtonElement {
  const button = document.createElement('button')
  const icon = document.createElement('i')

  button.type = 'button'
  button.setAttribute(passwordToggleButtonAttr, 'true')
  button.setAttribute('aria-label', '显示密码')
  button.setAttribute('aria-pressed', 'false')
  button.title = '显示密码'

  icon.className = 'icon-[ri--eye-line]'
  button.appendChild(icon)

  button.addEventListener('click', () => {
    const visible = input.type === 'password'
    input.type = visible ? 'text' : 'password'
    button.setAttribute('aria-label', visible ? '隐藏密码' : '显示密码')
    button.setAttribute('aria-pressed', visible ? 'true' : 'false')
    button.title = visible ? '隐藏密码' : '显示密码'
    icon.className = visible
      ? 'icon-[ri--eye-off-line]'
      : 'icon-[ri--eye-line]'
    input.focus()
  })

  return button
}
