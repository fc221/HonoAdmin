import type { ValidateTrigger } from './types'
import {
  applyNativeFieldValidation,
  getPjaxFieldForm,
  shouldValidateFieldOnTrigger,
} from './form-validation'

export function installRichTextEditors() {
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)
      ?.closest<HTMLButtonElement>('[data-rich-text-command]')
    if (!button) {
      return
    }

    const editor = button.closest<HTMLElement>('[data-rich-text-editor="true"]')
    const body = editor?.querySelector<HTMLElement>('[data-rich-text-body="true"]')
    if (!editor || !body) {
      return
    }

    event.preventDefault()
    body.focus()
    executeRichTextCommand(button.dataset.richTextCommand ?? '')
    syncRichTextEditor(editor)
  })

  document.addEventListener('input', (event) => {
    const body = (event.target as Element | null)
      ?.closest<HTMLElement>('[data-rich-text-body="true"]')
    const editor = body?.closest<HTMLElement>('[data-rich-text-editor="true"]')

    if (editor) {
      syncRichTextEditor(editor)
      validateRichTextEditorForTrigger(editor, 'change')
    }
  })

  document.addEventListener('blur', (event) => {
    const body = (event.target as Element | null)
      ?.closest<HTMLElement>('[data-rich-text-body="true"]')
    const editor = body?.closest<HTMLElement>('[data-rich-text-editor="true"]')

    if (editor) {
      syncRichTextEditor(editor)
      validateRichTextEditorForTrigger(editor, 'blur')
    }
  }, true)
}

export function syncRichTextEditors(root: Document | Element = document) {
  root
    .querySelectorAll<HTMLElement>('[data-rich-text-editor="true"]')
    .forEach(syncRichTextEditor)
}

export function insertRichTextImage(editor: HTMLElement, url: string) {
  const body = editor.querySelector<HTMLElement>('[data-rich-text-body="true"]')

  if (!body) {
    return
  }

  body.focus()
  document.execCommand('insertImage', false, url)

  if (!body.innerHTML.includes(url)) {
    const image = document.createElement('img')
    image.src = url
    image.alt = ''
    body.appendChild(image)
  }

  syncRichTextEditor(editor)
}

export function restoreRichTextEditorsFromInputs(
  root: Document | Element = document,
) {
  root
    .querySelectorAll<HTMLElement>('[data-rich-text-editor="true"]')
    .forEach((editor) => {
      const body = editor
        .querySelector<HTMLElement>('[data-rich-text-body="true"]')
      const input = editor
        .querySelector<HTMLTextAreaElement>('[data-rich-text-input="true"]')

      if (body && input) {
        body.innerHTML = input.value
      }
    })
}

function executeRichTextCommand(command: string) {
  if (command === 'createLink') {
    // eslint-disable-next-line no-alert -- Native editor command needs a URL.
    const href = window.prompt('请输入链接地址')
    if (href) {
      document.execCommand(command, false, href)
    }
    return
  }

  if (command) {
    document.execCommand(command, false)
  }
}

function syncRichTextEditor(editor: HTMLElement) {
  const body = editor.querySelector<HTMLElement>('[data-rich-text-body="true"]')
  const input = editor
    .querySelector<HTMLTextAreaElement>('[data-rich-text-input="true"]')

  if (body && input) {
    input.value = body.innerHTML.trim()
  }
}

function validateRichTextEditorForTrigger(
  editor: HTMLElement,
  trigger: ValidateTrigger,
) {
  const input = editor
    .querySelector<HTMLTextAreaElement>('[data-rich-text-input="true"]')
  const form = input ? getPjaxFieldForm(input) : null

  if (
    !input
    || !form
    || !shouldValidateFieldOnTrigger(form, input, trigger)
  ) {
    return
  }

  applyNativeFieldValidation(form, input, { allowHidden: true })
}
