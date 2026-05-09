import type { ValidateTrigger } from '../../client/types'
import type { FileUploadType } from '../../service/admin/system/file/enum'
import { useState } from 'hono/jsx'
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
  const [uploadMessage, setUploadMessage] = useState('')
  const [isUploadError, setIsUploadError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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

    setUploadMessage('正在上传图片...')
    setIsUploadError(false)
    setIsUploading(true)

    try {
      const result = await uploadImage(file, uploadType)
      insertImageIntoRoot(root, result.url)
      setUploadMessage('图片已插入正文。')
      setIsUploadError(false)
    } catch (error) {
      setUploadMessage(getUploadErrorMessage(error))
      setIsUploadError(true)
    } finally {
      input.value = ''
      setIsUploading(false)
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
                    disabled={isUploading}
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
                  {uploadMessage
                    ? (
                        <span
                          class={`self-center px-2 text-xs ${isUploadError ? 'text-error' : 'text-success'}`}
                        >
                          {uploadMessage}
                        </span>
                      )
                    : null}
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

function insertImageIntoRoot(root: HTMLElement, url: string) {
  const body = getRichTextBody(root)
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

  const input = getRichTextInput(root)
  if (input) {
    input.value = body.innerHTML.trim()
  }
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
