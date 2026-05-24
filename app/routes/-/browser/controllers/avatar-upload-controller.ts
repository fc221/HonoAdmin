import { Controller } from '@hotwired/stimulus'
import { getUploadErrorMessage, uploadImage } from '../upload-image'

export default class AvatarUploadController extends Controller<HTMLElement> {
  static targets = ['button', 'fileInput', 'message', 'valueInput']
  static values = {
    pendingMessage: { default: '正在上传头像...', type: String },
    successMessage: { default: '头像已上传并回填。', type: String },
  }

  declare readonly buttonTarget: HTMLButtonElement
  declare readonly fileInputTarget: HTMLInputElement
  declare readonly hasButtonTarget: boolean
  declare readonly hasMessageTarget: boolean
  declare readonly messageTarget: HTMLElement
  declare readonly pendingMessageValue: string
  declare readonly successMessageValue: string
  declare readonly valueInputTarget: HTMLInputElement

  choose(event: Event) {
    event.preventDefault()
    this.fileInputTarget.click()
  }

  valueChanged() {
    this.updatePreview(this.valueInputTarget.value)
  }

  async upload() {
    const file = this.fileInputTarget.files?.[0]
    if (!file) {
      return
    }

    this.setUploading(true)
    this.setMessage(this.pendingMessageValue, 'pending')

    try {
      const result = await uploadImage(file, 'avatar')
      this.valueInputTarget.value = result.url
      this.valueInputTarget.dispatchEvent(new Event('input', { bubbles: true }))
      this.valueInputTarget.dispatchEvent(new Event('change', { bubbles: true }))
      this.updatePreview(result.url)
      this.setMessage(this.successMessageValue, 'success')
    } catch (error) {
      this.setMessage(getUploadErrorMessage(error), 'error')
    } finally {
      this.fileInputTarget.value = ''
      this.setUploading(false)
    }
  }

  private setUploading(uploading: boolean) {
    if (this.hasButtonTarget) {
      this.buttonTarget.disabled = uploading
    }
  }

  private setMessage(message: string, status: 'error' | 'pending' | 'success') {
    if (!this.hasMessageTarget) {
      return
    }

    this.messageTarget.textContent = message
    this.messageTarget.hidden = false
    this.messageTarget.classList.toggle('hidden', false)
    this.messageTarget.classList.toggle('text-error', status === 'error')
    this.messageTarget.classList.toggle('text-success', status === 'success')
  }

  private updatePreview(src: string) {
    const image = this.element.querySelector<HTMLImageElement>(
      '[data-avatar-image-target="image"]',
    )
    if (!image) {
      return
    }

    if (src) {
      image.src = src
      image.dispatchEvent(new Event('load'))
      return
    }

    image.removeAttribute('src')
  }
}
