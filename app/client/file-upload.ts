import type { FileUploadType } from '../service'
import { insertRichTextImage } from './rich-text'

interface UploadResult {
  data: {
    id: number
    url: string
  }
  ok: true
}

export function installFileUploads() {
  document.addEventListener('dragover', (event) => {
    const dropzone = getFileDropzone(event.target)
    if (!dropzone) {
      return
    }

    event.preventDefault()
    dropzone.classList.add('border-primary', 'bg-primary/5')
  })

  document.addEventListener('dragleave', (event) => {
    const dropzone = getFileDropzone(event.target)
    if (!dropzone || dropzone.contains(event.relatedTarget as Node | null)) {
      return
    }

    dropzone.classList.remove('border-primary', 'bg-primary/5')
  })

  document.addEventListener('drop', (event) => {
    const dropzone = getFileDropzone(event.target)
    const files = event.dataTransfer?.files
    const input = dropzone?.parentElement?.querySelector<HTMLInputElement>(
      '[data-file-dropzone-input="true"]',
    )

    if (!dropzone || !input || !files?.length) {
      return
    }

    event.preventDefault()
    dropzone.classList.remove('border-primary', 'bg-primary/5')
    input.files = files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  document.addEventListener('click', (event) => {
    const uploadTrigger = (event.target as Element | null)
      ?.closest<HTMLButtonElement>('[data-file-upload-trigger="true"]')
    if (uploadTrigger) {
      event.preventDefault()
      uploadTrigger
        .closest<HTMLElement>('[data-file-upload="true"]')
        ?.querySelector<HTMLInputElement>('[data-file-upload-input="true"]')
        ?.click()
      return
    }

    const button = (event.target as Element | null)
      ?.closest<HTMLButtonElement>('[data-rich-text-upload="true"]')
    if (!button) {
      return
    }

    event.preventDefault()
    const editor = button.closest<HTMLElement>('[data-rich-text-editor="true"]')
    const input = editor?.querySelector<HTMLInputElement>(
      '[data-rich-text-upload-input="true"]',
    )

    input?.click()
  })

  document.addEventListener('change', (event) => {
    const target = event.target

    if (!(target instanceof HTMLInputElement) || target.type !== 'file') {
      return
    }

    if (target.matches('[data-file-dropzone-input="true"]')) {
      updateDropzoneSummary(target)
      return
    }

    if (target.matches('[data-file-upload-input="true"]')) {
      void uploadFieldFile(target)
      return
    }

    if (target.matches('[data-rich-text-upload-input="true"]')) {
      void uploadRichTextFile(target)
    }
  })
}

function getFileDropzone(target: EventTarget | null): HTMLElement | null {
  return (target as Element | null)?.closest<HTMLElement>(
    '[data-file-dropzone="true"]',
  ) ?? null
}

function updateDropzoneSummary(input: HTMLInputElement): void {
  const fieldset = input.closest('fieldset')
  const summary = fieldset?.querySelector<HTMLElement>(
    '[data-file-dropzone-summary="true"]',
  )
  const files = [...(input.files ?? [])]

  if (!summary) {
    return
  }

  if (!files.length) {
    summary.textContent = '暂未选择文件'
    return
  }

  const fileNames = files.slice(0, 3).map((file) => file.name).join('、')
  const suffix = files.length > 3 ? ` 等 ${files.length} 个文件` : ''
  summary.textContent = `已选择 ${files.length} 个文件：${fileNames}${suffix}`
}

async function uploadFieldFile(input: HTMLInputElement): Promise<void> {
  const root = input.closest<HTMLElement>('[data-file-upload="true"]')
  const uploadType = normalizeUploadType(root?.dataset.fileUploadType)
  const target = root?.querySelector<HTMLInputElement>(
    '[data-file-upload-target="true"]',
  )
  const preview = root?.querySelector<HTMLImageElement>(
    '[data-file-upload-preview="true"]',
  )
  const placeholder = root?.querySelector<HTMLElement>(
    '[data-file-upload-placeholder="true"]',
  )
  const file = input.files?.[0]

  if (!root || !target || !uploadType || !file) {
    return
  }

  setUploadMessage(root, '正在上传图片...', false)
  input.disabled = true

  try {
    const result = await uploadImage(file, uploadType)
    target.value = result.url
    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.dispatchEvent(new Event('change', { bubbles: true }))

    if (preview) {
      preview.src = result.url
      preview.classList.remove('hidden')
    }
    placeholder?.classList.add('hidden')

    setUploadMessage(root, '图片已上传并回填。', false)
  } catch (error) {
    setUploadMessage(root, getUploadErrorMessage(error), true)
  } finally {
    input.disabled = false
    input.value = ''
  }
}

async function uploadRichTextFile(input: HTMLInputElement): Promise<void> {
  const editor = input.closest<HTMLElement>('[data-rich-text-editor="true"]')
  const uploadType = normalizeUploadType(editor?.dataset.richTextUploadType)
  const file = input.files?.[0]

  if (!editor || !uploadType || !file) {
    return
  }

  const message = editor.querySelector<HTMLElement>(
    '[data-rich-text-upload-message="true"]',
  )

  setTextMessage(message, '正在上传图片...', false)
  input.disabled = true

  try {
    const result = await uploadImage(file, uploadType)
    insertRichTextImage(editor, result.url)
    setTextMessage(message, '图片已插入正文。', false)
  } catch (error) {
    setTextMessage(message, getUploadErrorMessage(error), true)
  } finally {
    input.disabled = false
    input.value = ''
  }
}

async function uploadImage(
  file: File,
  uploadType: FileUploadType,
): Promise<UploadResult['data']> {
  const body = new FormData()

  body.set('intent', 'upload')
  body.set('uploadType', uploadType)
  body.set('file', file)

  const response = await fetch('/admin/system/file', {
    body,
    headers: {
      'Accept': 'application/json',
      'X-Hono-File-Upload': 'true',
    },
    method: 'POST',
  })
  const result = await response.json().catch(() => null)

  if (!response.ok || !isUploadResult(result)) {
    throw new Error(getResponseErrorMessage(result))
  }

  return result.data
}

function isUploadResult(value: unknown): value is UploadResult {
  const result = value as Partial<UploadResult> | null
  return (
    !!result
    && result.ok === true
    && typeof result.data?.id === 'number'
    && typeof result.data.url === 'string'
  )
}

function getResponseErrorMessage(value: unknown): string {
  if (value && typeof value === 'object') {
    const error = (value as { error?: { message?: unknown } }).error
    if (typeof error?.message === 'string' && error.message) {
      return error.message
    }
  }

  return '图片上传失败。'
}

function normalizeUploadType(value: string | undefined): FileUploadType | null {
  if (
    value === 'avatar'
    || value === 'notification'
    || value === 'page'
  ) {
    return value
  }

  return null
}

function setUploadMessage(
  root: HTMLElement,
  message: string,
  isError: boolean,
) {
  setTextMessage(
    root.querySelector<HTMLElement>('[data-file-upload-message="true"]'),
    message,
    isError,
  )
}

function setTextMessage(
  element: HTMLElement | null,
  message: string,
  isError: boolean,
) {
  if (!element) {
    return
  }

  element.textContent = message
  element.classList.toggle('text-error', isError)
  element.classList.toggle('text-success', !isError)
}

function getUploadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '图片上传失败。'
}
