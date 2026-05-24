import type { FileUploadType } from '../../../../service/admin/system/file/enum'
import { Controller } from '@hotwired/stimulus'
import { getUploadErrorMessage, uploadImage } from '../upload-image'

type PreviewKind = 'file' | 'image' | 'video'
type UploadStatus = 'done' | 'error' | 'queued' | 'uploading'

interface SelectedFile {
  canUpload: boolean
  errorMessage?: string
  file: File
  id: string
  previewKind: PreviewKind
  previewUrl?: string
  progress: number
  status: UploadStatus
}

const acceptedImageExtensions = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp'])
const acceptedImageMimeTypes = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const pagePath = '/admin/system/file'
const unsupportedImageMessage = '仅支持 JPG、PNG、WEBP、GIF 图片。'

export default class FileDropzoneController extends Controller<HTMLElement> {
  static targets = ['addLabel', 'dropArea', 'grid', 'input', 'message']

  declare readonly addLabelTarget: HTMLLabelElement
  declare readonly dropAreaTarget: HTMLElement
  declare readonly gridTarget: HTMLElement
  declare readonly inputTarget: HTMLInputElement
  declare readonly messageTarget: HTMLElement

  private files: SelectedFile[] = []
  private form: HTMLFormElement | null = null
  private isUploading = false

  connect() {
    this.form = this.element.closest('form')
    this.form?.addEventListener('submit', this.handleSubmit)
  }

  disconnect() {
    this.form?.removeEventListener('submit', this.handleSubmit)
    for (const file of this.files) {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl)
      }
    }
  }

  choose(event: Event) {
    event.preventDefault()
    this.inputTarget.click()
  }

  dragLeave(event: DragEvent) {
    const target = event.currentTarget as HTMLElement
    if (!target.contains(event.relatedTarget as Node | null)) {
      this.setDragging(false)
    }
  }

  dragOver(event: DragEvent) {
    event.preventDefault()
    this.setDragging(true)
  }

  drop(event: DragEvent) {
    event.preventDefault()
    this.setDragging(false)

    const droppedFiles = event.dataTransfer?.files
    if (droppedFiles?.length) {
      this.addFiles(droppedFiles)
    }
  }

  inputChanged(event: Event) {
    const input = event.target instanceof HTMLInputElement
      ? event.target
      : this.inputTarget

    if (input.files?.length) {
      this.addFiles(input.files)
    }

    input.value = ''
  }

  remove(event: Event) {
    const button = event.currentTarget as HTMLElement
    const fileId = button.dataset.fileId
    if (!fileId) {
      return
    }

    this.removeFile(fileId)
  }

  private handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    if (this.form) {
      void this.uploadSelectedFiles(this.form)
    }
  }

  private addFiles(fileList: FileList | File[]) {
    const candidateFiles = Array.from(fileList).filter((file) => file.size > 0)
    const nextFiles = candidateFiles.map((file) =>
      createSelectedFile(file, isAcceptedImage(file))
    )
    const acceptedCount = nextFiles.filter((file) => file.canUpload).length
    const rejectedCount = nextFiles.length - acceptedCount
    if (!nextFiles.length) {
      return
    }

    for (const selectedFile of nextFiles) {
      this.files.push(selectedFile)
      this.gridTarget.insertBefore(
        this.createFileCard(selectedFile),
        this.addLabelTarget,
      )
    }

    this.setMessage(
      rejectedCount > 0
        ? `已添加 ${nextFiles.length} 个文件，${rejectedCount} 个文件格式不受支持。`
        : `已添加 ${nextFiles.length} 个文件。`,
      rejectedCount > 0,
    )
  }

  private removeFile(fileId: string) {
    const target = this.files.find((file) => file.id === fileId)
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl)
    }

    this.files = this.files.filter((file) => file.id !== fileId)
    this.element.querySelector(`[data-file-card-id="${cssEscape(fileId)}"]`)?.remove()
  }

  private async uploadSelectedFiles(form: HTMLFormElement) {
    if (this.isUploading) {
      return
    }

    const invalidFiles = this.files.filter((file) => !file.canUpload)
    if (invalidFiles.length) {
      this.setMessage('请先移除不支持的文件。', true)
      return
    }

    const pendingFiles = this.files.filter((file) =>
      file.canUpload && file.status !== 'done'
    )
    if (!pendingFiles.length) {
      this.setMessage('请先选择要上传的文件。', true)
      return
    }

    const uploadType = getUploadType(form)
    this.isUploading = true
    this.addLabelTarget.classList.add('pointer-events-none', 'opacity-60')
    for (const item of pendingFiles) {
      this.updateFileCard(item)
    }
    this.setMessage(`正在上传 ${pendingFiles.length} 个文件...`, false)

    let failedCount = 0
    for (const item of pendingFiles) {
      this.updateFile(item.id, {
        errorMessage: undefined,
        progress: 0,
        status: 'uploading',
      })
      try {
        await uploadImage(item.file, uploadType, {
          onProgress: (progress) => this.updateFile(item.id, { progress }),
        })
        this.updateFile(item.id, { progress: 100, status: 'done' })
      } catch (error) {
        failedCount += 1
        this.updateFile(item.id, {
          errorMessage: getUploadErrorMessage(error),
          status: 'error',
        })
      }
    }

    this.isUploading = false
    this.addLabelTarget.classList.remove('pointer-events-none', 'opacity-60')
    for (const item of pendingFiles) {
      this.updateFileCard(item)
    }

    if (failedCount > 0) {
      this.setMessage(`${failedCount} 个文件上传失败，请检查后重试。`, true)
      return
    }

    this.setMessage('文件已上传，正在刷新列表...', false)
    window.setTimeout(() => {
      window.location.href = pagePath
    }, 500)
  }

  private updateFile(
    fileId: string,
    patch: Partial<Pick<SelectedFile, 'errorMessage' | 'progress' | 'status'>>,
  ) {
    const file = this.files.find((item) => item.id === fileId)
    if (!file) {
      return
    }

    Object.assign(file, patch)
    this.updateFileCard(file)
  }

  private createFileCard(file: SelectedFile) {
    const card = document.createElement('div')
    card.className = 'relative aspect-square overflow-hidden rounded-box border border-base-300 bg-base-100'
    card.dataset.fileCardId = file.id

    const preview = createFilePreview(file)
    card.appendChild(preview)

    const footer = document.createElement('div')
    footer.className = 'absolute inset-x-0 bottom-0 bg-base-100/95 p-2'

    const name = document.createElement('p')
    name.className = 'truncate text-xs font-medium'
    name.title = file.file.name
    name.textContent = file.file.name

    const progressTrack = document.createElement('div')
    progressTrack.className = 'mt-1 h-1.5 overflow-hidden rounded-full bg-base-300'
    const progressBar = document.createElement('div')
    progressBar.className = 'h-full rounded-full bg-primary'
    progressBar.style.width = `${file.progress}%`
    progressBar.dataset.fileProgress = 'true'
    progressTrack.appendChild(progressBar)

    const status = document.createElement('p')
    status.className = 'mt-1 truncate text-[11px] text-base-content/55'
    status.dataset.fileStatus = 'true'
    status.textContent = getStatusText(file)

    footer.appendChild(name)
    footer.appendChild(progressTrack)
    footer.appendChild(status)
    card.appendChild(footer)

    const removeButton = document.createElement('button')
    removeButton.ariaLabel = '移除文件'
    removeButton.className = 'btn btn-circle btn-ghost btn-xs absolute right-1 top-1 bg-base-100/80'
    removeButton.type = 'button'
    removeButton.dataset.action = 'file-dropzone#remove'
    removeButton.dataset.fileId = file.id
    removeButton.innerHTML = '<i class="icon-[ri--close-line]"></i>'
    card.appendChild(removeButton)

    return card
  }

  private updateFileCard(file: SelectedFile) {
    const card = this.element.querySelector<HTMLElement>(
      `[data-file-card-id="${cssEscape(file.id)}"]`,
    )
    if (!card) {
      return
    }

    const progress = card.querySelector<HTMLElement>('[data-file-progress="true"]')
    const status = card.querySelector<HTMLElement>('[data-file-status="true"]')
    const removeButton = card.querySelector<HTMLButtonElement>(
      '[data-action="file-dropzone#remove"]',
    )

    if (progress) {
      progress.style.width = `${file.progress}%`
      progress.classList.toggle('bg-error', file.status === 'error')
      progress.classList.toggle('bg-primary', file.status !== 'error')
    }

    if (status) {
      status.textContent = getStatusText(file)
      status.className = [
        'mt-1 truncate text-[11px]',
        file.status === 'error' ? 'text-error' : 'text-base-content/55',
      ].join(' ')
    }

    if (removeButton) {
      removeButton.hidden = this.isUploading || file.status === 'done'
    }
  }

  private setDragging(isDragging: boolean) {
    this.dropAreaTarget.classList.toggle('border-primary', isDragging)
    this.dropAreaTarget.classList.toggle('bg-primary/5', isDragging)
    this.dropAreaTarget.classList.toggle('border-base-300', !isDragging)
    this.dropAreaTarget.classList.toggle('bg-base-200/35', !isDragging)
  }

  private setMessage(message: string, isError: boolean) {
    this.messageTarget.textContent = message
    this.messageTarget.className = [
      'mt-3 text-sm',
      isError ? 'text-error' : 'text-base-content/60',
    ].join(' ')
  }
}

function createFilePreview(file: SelectedFile): HTMLElement {
  if (file.previewKind === 'image' && file.previewUrl) {
    const image = document.createElement('img')
    image.alt = file.file.name
    image.className = 'h-full w-full object-cover'
    image.src = file.previewUrl
    return image
  }

  if (file.previewKind === 'video' && file.previewUrl) {
    const video = document.createElement('video')
    video.className = 'h-full w-full object-cover'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.src = file.previewUrl
    return video
  }

  const fallback = document.createElement('div')
  fallback.className = 'flex h-full w-full items-center justify-center bg-base-200 text-base-content/45'
  fallback.innerHTML = '<i class="icon-[ri--file-3-line] text-5xl"></i>'
  return fallback
}

function createSelectedFile(file: File, canUpload: boolean): SelectedFile {
  const previewKind = getPreviewKind(file)
  return {
    canUpload,
    errorMessage: canUpload ? undefined : unsupportedImageMessage,
    file,
    id: createFileId(),
    previewKind,
    previewUrl: previewKind === 'file' ? undefined : URL.createObjectURL(file),
    progress: 0,
    status: canUpload ? 'queued' : 'error',
  }
}

function createFileId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getPreviewKind(file: File): PreviewKind {
  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type.startsWith('video/')) {
    return 'video'
  }

  return 'file'
}

function isAcceptedImage(file: File): boolean {
  const mimeType = file.type.split(';', 1)[0]?.trim().toLowerCase() ?? ''
  if (acceptedImageMimeTypes.has(mimeType)) {
    return true
  }

  const extension = file.name.split('.').pop()?.trim().toLowerCase() ?? ''
  return acceptedImageExtensions.has(extension)
}

function getStatusText(file: SelectedFile): string {
  if (file.status === 'done') {
    return '上传完成'
  }

  if (file.status === 'error') {
    return file.errorMessage ?? '上传失败'
  }

  if (file.status === 'uploading') {
    return `${file.progress}%`
  }

  return formatFileSize(file.file.size)
}

function getUploadType(form: HTMLFormElement): FileUploadType {
  const input = form.querySelector('[name="uploadType"]') as HTMLSelectElement | null
  return input?.value === 'avatar' || input?.value === 'notification' || input?.value === 'page'
    ? input.value
    : 'page'
}

function formatFileSize(value: number): string {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function cssEscape(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}
