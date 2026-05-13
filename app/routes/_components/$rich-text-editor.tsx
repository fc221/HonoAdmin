import type { ValidateTrigger } from '../../client/types'
import type { FileUploadType } from '../../service/admin/system/file/enum'
import {
  applyNativeFieldValidation,
  getFieldForm,
  shouldValidateFieldOnTrigger,
} from '../../client/form-validation'
import { sanitizeRichTextHtml } from '../../utils/html'
import {
  getUploadErrorMessage,
  uploadImage,
} from './_utils/upload-image'

interface Props {
  label: string
  name: string
  placeholder?: string
  uploadType?: Extract<FileUploadType, 'notification' | 'page'>
  value?: string
}

const toolbarButtons = [
  { command: 'bold', icon: 'icon-[ri--bold]', label: '加粗' },
  { command: 'italic', icon: 'icon-[ri--italic]', label: '斜体' },
  { command: 'underline', icon: 'icon-[ri--underline]', label: '下划线' },
  { command: 'insertUnorderedList', icon: 'icon-[ri--list-unordered]', label: '无序列表' },
  { command: 'insertOrderedList', icon: 'icon-[ri--list-ordered]', label: '有序列表' },
  { command: 'createLink', icon: 'icon-[ri--link]', label: '链接' },
  { command: 'removeFormat', icon: 'icon-[ri--format-clear]', label: '清除格式' },
]

export default function RichTextEditor({
  label,
  name,
  placeholder = '请输入内容',
  uploadType,
  value = '',
}: Props) {
  const sanitizedValue = sanitizeRichTextHtml(value)

  const syncInput = (root: HTMLElement) => {
    const body = getRichTextBody(root)
    const input = getRichTextInput(root)
    if (body && input) {
      input.value = body.innerHTML.trim()
    }
  }

  const validateForTrigger = (root: HTMLElement, trigger: ValidateTrigger) => {
    const input = getRichTextInput(root)
    const form = input ? getFieldForm(input) : null
    if (
      !input
      || !form
      || !shouldValidateFieldOnTrigger(form, input, trigger)
    ) {
      return
    }

    applyNativeFieldValidation(form, input, { allowHidden: true })
  }

  const handleCommand = (event: Event, command: string) => {
    const root = getRichTextRoot(event.currentTarget)
    const body = root ? getRichTextBody(root) : null
    if (!root || !body) {
      return
    }

    body.focus()
    executeRichTextCommand(command)
    syncInput(root)
  }

  const handleBodyInput = (event: Event) => {
    const root = getRichTextRoot(event.currentTarget)
    if (root) {
      syncInput(root)
      validateForTrigger(root, 'change')
    }
  }

  const handleBodyBlur = (event: Event) => {
    const root = getRichTextRoot(event.currentTarget)
    if (root) {
      syncInput(root)
      validateForTrigger(root, 'blur')
    }
  }

  const handleUpload = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const root = getRichTextRoot(input)
    const file = input.files?.[0]
    if (!uploadType || !file || !root) {
      return
    }

    setUploadStatus(root, '正在上传图片...', false)
    setUploadButtonDisabled(root, true)

    try {
      const result = await uploadImage(file, uploadType)
      insertImageIntoRoot(root, result.url)
      setUploadStatus(root, '图片已插入正文。', false)
    } catch (error) {
      setUploadStatus(root, getUploadErrorMessage(error), true)
    } finally {
      input.value = ''
      setUploadButtonDisabled(root, false)
    }
  }

  return (
    <fieldset class="fieldset lg:col-span-2" data-form-field={name}>
      <legend class="fieldset-legend">{label}</legend>
      <div
        class="overflow-hidden rounded-box border border-base-300 bg-base-100"
        data-rich-text-editor-root="true"
      >
        <div class="flex flex-wrap gap-1 border-b border-base-300 bg-base-200/60 p-2">
          {toolbarButtons.map((button) => (
            <button
              aria-label={button.label}
              class="btn btn-ghost btn-sm"
              key={button.command}
              title={button.label}
              type="button"
              onClick={(event) => handleCommand(event, button.command)}
            >
              <i class={button.icon} />
            </button>
          ))}
          {uploadType
            ? (
                <>
                  <button
                    aria-label="上传图片"
                    class="btn btn-ghost btn-sm"
                    data-rich-text-upload-button="true"
                    title="上传图片"
                    type="button"
                    onClick={(event) => {
                      getRichTextRoot(event.currentTarget)
                        ?.querySelector<HTMLInputElement>(
                          '[data-rich-text-upload-input="true"]',
                        )
                        ?.click()
                    }}
                  >
                    <i class="icon-[ri--image-add-line]" />
                  </button>
                  <input
                    accept="image/gif,image/jpeg,image/png,image/webp"
                    class="hidden"
                    data-rich-text-upload-input="true"
                    type="file"
                    onChange={handleUpload}
                  />
                  <span
                    class="hidden self-center px-2 text-xs"
                    data-rich-text-upload-message="true"
                  />
                </>
              )
            : null}
        </div>
        <div
          class="rich-text-content min-h-80 overflow-y-auto bg-base-100 p-4 text-sm leading-7 outline-none"
          contentEditable={true}
          data-placeholder={placeholder}
          data-rich-text-body="true"
          dangerouslySetInnerHTML={{ __html: sanitizedValue }}
          onBlur={handleBodyBlur}
          onInput={handleBodyInput}
        />
        <textarea
          class="hidden"
          data-rich-text-input="true"
          name={name}
        >
          {sanitizedValue}
        </textarea>
      </div>
      <p class="label">支持加粗、列表和链接，内容将以 HTML 保存。</p>
    </fieldset>
  )
}

function getRichTextRoot(target: EventTarget | null): HTMLElement | null {
  return (target as Element | null)?.closest<HTMLElement>(
    '[data-rich-text-editor-root="true"]',
  ) ?? null
}

function getRichTextBody(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-rich-text-body="true"]')
}

function getRichTextInput(root: HTMLElement): HTMLTextAreaElement | null {
  return root.querySelector<HTMLTextAreaElement>('[data-rich-text-input="true"]')
}

function setUploadButtonDisabled(root: HTMLElement, disabled: boolean) {
  const button = root.querySelector(
    '[data-rich-text-upload-button="true"]',
  ) as HTMLButtonElement | null

  if (button) {
    button.disabled = disabled
  }
}

function setUploadStatus(
  root: HTMLElement,
  message: string,
  isError: boolean,
) {
  const element = root.querySelector(
    '[data-rich-text-upload-message="true"]',
  ) as HTMLElement | null

  if (!element) {
    return
  }

  element.textContent = message
  element.className = [
    'self-center px-2 text-xs',
    message ? '' : 'hidden',
    isError ? 'text-error' : 'text-success',
  ].filter(Boolean).join(' ')
}

function insertImageIntoRoot(root: HTMLElement, url: string) {
  const body = getRichTextBody(root)
  if (!body) {
    return
  }

  const image = document.createElement('img')
  image.src = url
  image.alt = ''
  body.focus()
  const selection = window.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null

  if (range && isRangeInsideElement(range, body)) {
    range.deleteContents()
    range.insertNode(image)
    range.setStartAfter(image)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
  } else {
    body.appendChild(image)
  }

  const input = getRichTextInput(root)
  if (input) {
    input.value = body.innerHTML.trim()
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function isRangeInsideElement(range: Range, element: HTMLElement): boolean {
  const container = range.commonAncestorContainer
  return container === element || element.contains(container)
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
