import type { FileUploadType } from '../../../../service/admin/system/file/enum'
import { Controller } from '@hotwired/stimulus'
import { getUploadErrorMessage, uploadImage } from '../upload-image'

export default class FileUploadFieldController extends Controller<HTMLElement> {
  static targets = ['fileInput', 'image', 'message', 'valueInput']
  static values = {
    help: String,
    uploadType: String,
  }

  declare readonly fileInputTarget: HTMLInputElement
  declare readonly hasImageTarget: boolean
  declare readonly helpValue: string
  declare readonly imageTarget: HTMLImageElement
  declare readonly messageTarget: HTMLElement
  declare readonly uploadTypeValue: FileUploadType
  declare readonly valueInputTarget: HTMLInputElement

  valueChanged() {
    this.updatePreview(this.valueInputTarget.value)
  }

  async upload() {
    const file = this.fileInputTarget.files?.[0]
    if (!file) {
      return
    }

    this.fileInputTarget.disabled = true
    this.setMessage('正在上传图片...', 'pending')

    try {
      const result = await uploadImage(file, this.uploadTypeValue)
      this.valueInputTarget.value = result.url
      this.valueInputTarget.dispatchEvent(new Event('input', { bubbles: true }))
      this.valueInputTarget.dispatchEvent(new Event('change', { bubbles: true }))
      this.updatePreview(result.url)
      this.setMessage('图片已上传并回填。', 'success')
    } catch (error) {
      this.setMessage(getUploadErrorMessage(error), 'error')
    } finally {
      this.fileInputTarget.value = ''
      this.fileInputTarget.disabled = false
    }
  }

  private updatePreview(src: string) {
    if (!this.hasImageTarget) {
      return
    }

    if (src) {
      this.imageTarget.src = src
      this.imageTarget.classList.remove('hidden')
      return
    }

    this.imageTarget.removeAttribute('src')
    this.imageTarget.classList.add('hidden')
  }

  private setMessage(message: string, status: 'error' | 'pending' | 'success') {
    this.messageTarget.textContent = message
    this.messageTarget.classList.toggle('text-error', status === 'error')
    this.messageTarget.classList.toggle(
      'text-success',
      status === 'success' && message !== this.helpValue,
    )
  }
}
