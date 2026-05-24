import type { FileUploadType } from '../../../../service/admin/system/file/enum'
import type { ValidateTrigger } from '../types'
import { Controller } from '@hotwired/stimulus'
import {
  applyNativeFieldValidation,
  getFieldForm,
  shouldValidateFieldOnTrigger,
} from '../form-validation'
import { getUploadErrorMessage, uploadImage } from '../upload-image'

export default class RichTextController extends Controller<HTMLElement> {
  static targets = ['body', 'input', 'uploadButton', 'uploadInput', 'uploadMessage']
  static values = {
    uploadType: String,
  }

  declare readonly bodyTarget: HTMLElement
  declare readonly hasUploadButtonTarget: boolean
  declare readonly hasUploadInputTarget: boolean
  declare readonly hasUploadMessageTarget: boolean
  declare readonly inputTarget: HTMLTextAreaElement
  declare readonly uploadButtonTarget: HTMLButtonElement
  declare readonly uploadInputTarget: HTMLInputElement
  declare readonly uploadMessageTarget: HTMLElement
  declare readonly uploadTypeValue: Extract<FileUploadType, 'notification' | 'page'>

  command(event: Event) {
    const command = (event.currentTarget as HTMLElement).dataset.richTextCommand
    if (!command) {
      return
    }

    this.bodyTarget.focus()
    executeRichTextCommand(command)
    this.syncInput()
  }

  bodyInput() {
    this.syncInput()
    this.validateForTrigger('change')
  }

  bodyBlur() {
    this.syncInput()
    this.validateForTrigger('blur')
  }

  openUpload(event: Event) {
    event.preventDefault()
    this.uploadInputTarget.click()
  }

  async upload() {
    const file = this.uploadInputTarget.files?.[0]
    if (!this.hasUploadInputTarget || !file || !this.uploadTypeValue) {
      return
    }

    this.setUploadStatus('正在上传图片...', false)
    this.setUploadButtonDisabled(true)

    try {
      const result = await uploadImage(file, this.uploadTypeValue)
      this.insertImage(result.url)
      this.setUploadStatus('图片已插入正文。', false)
    } catch (error) {
      this.setUploadStatus(getUploadErrorMessage(error), true)
    } finally {
      this.uploadInputTarget.value = ''
      this.setUploadButtonDisabled(false)
    }
  }

  private syncInput() {
    this.inputTarget.value = this.bodyTarget.innerHTML.trim()
  }

  private validateForTrigger(trigger: ValidateTrigger) {
    const form = getFieldForm(this.inputTarget)
    if (!form || !shouldValidateFieldOnTrigger(form, this.inputTarget, trigger)) {
      return
    }

    applyNativeFieldValidation(form, this.inputTarget, { allowHidden: true })
  }

  private setUploadButtonDisabled(disabled: boolean) {
    if (this.hasUploadButtonTarget) {
      this.uploadButtonTarget.disabled = disabled
    }
  }

  private setUploadStatus(message: string, isError: boolean) {
    if (!this.hasUploadMessageTarget) {
      return
    }

    this.uploadMessageTarget.textContent = message
    this.uploadMessageTarget.className = [
      'self-center px-2 text-xs',
      message ? '' : 'hidden',
      isError ? 'text-error' : 'text-success',
    ].filter(Boolean).join(' ')
  }

  private insertImage(url: string) {
    const image = document.createElement('img')
    image.src = url
    image.alt = ''
    this.bodyTarget.focus()

    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null

    if (range && isRangeInsideElement(range, this.bodyTarget)) {
      range.deleteContents()
      range.insertNode(image)
      range.setStartAfter(image)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    } else {
      this.bodyTarget.appendChild(image)
    }

    this.syncInput()
    this.inputTarget.dispatchEvent(new Event('input', { bubbles: true }))
    this.inputTarget.dispatchEvent(new Event('change', { bubbles: true }))
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

  document.execCommand(command, false)
}
