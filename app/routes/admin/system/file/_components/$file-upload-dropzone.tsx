import type { FileUploadType } from '../../../../../service/admin/system/file/enum'
import { useEffect, useState } from 'hono/jsx'
import { getUploadErrorMessage, uploadImage } from '../../../../_components/_utils/upload-image'

type PreviewKind = 'file' | 'image' | 'video'
type UploadStatus = 'done' | 'error' | 'queued' | 'uploading'

interface SelectedFile {
  errorMessage?: string
  file: File
  id: string
  previewKind: PreviewKind
  previewUrl?: string
  progress: number
  status: UploadStatus
}

const inputId = 'file-upload-input'
const pagePath = '/admin/system/file'
const acceptedImageExtensions = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp'])
const acceptedImageMimeTypes = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export default function FileUploadDropzone() {
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('可拖拽文件到卡片区域，或点击加号继续添加。')
  const [isError, setIsError] = useState(false)

  const addFiles = (fileList: FileList | File[]) => {
    const candidateFiles = Array.from(fileList).filter((file) => file.size > 0)
    const nextFiles = candidateFiles.filter(isAcceptedImage)
    const rejectedCount = candidateFiles.length - nextFiles.length
    if (!nextFiles.length) {
      if (rejectedCount > 0) {
        setMessage('仅支持 JPG、PNG、WEBP、GIF 图片。')
        setIsError(true)
      }
      return
    }

    setFiles((current) => [
      ...current,
      ...nextFiles.map(createSelectedFile),
    ])
    setMessage(
      rejectedCount > 0
        ? `已添加 ${nextFiles.length} 张图片，已忽略 ${rejectedCount} 个非图片文件。`
        : `已添加 ${nextFiles.length} 张图片。`,
    )
    setIsError(rejectedCount > 0)
  }

  const removeFile = (fileId: string) => {
    setFiles((current) => {
      const target = current.find((file) => file.id === fileId)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }

      return current.filter((file) => file.id !== fileId)
    })
  }

  const updateFile = (
    fileId: string,
    patch: Partial<Pick<SelectedFile, 'errorMessage' | 'progress' | 'status'>>,
  ) => {
    setFiles((current) =>
      current.map((file) =>
        file.id === fileId ? { ...file, ...patch } : file
      )
    )
  }

  const uploadSelectedFiles = async (form: HTMLFormElement) => {
    if (isUploading) {
      return
    }

    const pendingFiles = files.filter((file) => file.status !== 'done')
    if (!pendingFiles.length) {
      setMessage('请先选择要上传的文件。')
      setIsError(true)
      return
    }

    const uploadType = getUploadType(form)
    setIsUploading(true)
    setMessage(`正在上传 ${pendingFiles.length} 个文件...`)
    setIsError(false)

    let failedCount = 0
    for (const item of pendingFiles) {
      updateFile(item.id, { errorMessage: undefined, progress: 0, status: 'uploading' })
      try {
        await uploadImage(item.file, uploadType, {
          onProgress: (progress) => updateFile(item.id, { progress }),
        })
        updateFile(item.id, { progress: 100, status: 'done' })
      } catch (error) {
        failedCount += 1
        updateFile(item.id, {
          errorMessage: getUploadErrorMessage(error),
          status: 'error',
        })
      }
    }

    setIsUploading(false)

    if (failedCount > 0) {
      setMessage(`${failedCount} 个文件上传失败，请检查后重试。`)
      setIsError(true)
      return
    }

    setMessage('文件已上传，正在刷新列表...')
    setIsError(false)
    window.setTimeout(() => {
      const message = encodeURIComponent(`已上传 ${pendingFiles.length} 个文件。`)
      window.location.href = `${pagePath}?alert=success&message=${message}`
    }, 500)
  }

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-file-dropzone-root="true"]')
    const form = root?.closest<HTMLFormElement>('form')
    if (!root || !form) {
      return
    }

    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault()
      void uploadSelectedFiles(form)
    }

    form.addEventListener('submit', handleSubmit)
    return () => form.removeEventListener('submit', handleSubmit)
  }, [files, isUploading])

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const droppedFiles = event.dataTransfer?.files
    if (droppedFiles?.length) {
      addFiles(droppedFiles)
    }
  }

  return (
    <fieldset class="fieldset" data-file-dropzone-root="true">
      <legend class="fieldset-legend">上传文件</legend>
      <div
        class={`rounded-box border border-dashed p-4 transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200/35'}`}
        onDragLeave={(event: DragEvent) => {
          const target = event.currentTarget as HTMLElement
          if (!target.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false)
          }
        }}
        onDragOver={(event: DragEvent) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDrop={handleDrop}
      >
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((item) => (
            <FileCard
              file={item}
              isUploading={isUploading}
              key={item.id}
              onRemove={() => removeFile(item.id)}
            />
          ))}
          <label
            class={`aspect-square cursor-pointer rounded-box border border-dashed border-base-300 bg-base-100 transition-colors hover:border-primary hover:bg-primary/5 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
            for={inputId}
          >
            <span class="flex h-full flex-col items-center justify-center gap-2 text-base-content/65">
              <i class="icon-[ri--add-line] text-4xl text-primary" />
              <span class="text-sm font-medium">添加文件</span>
            </span>
          </label>
        </div>
        <p class={`mt-3 text-sm ${isError ? 'text-error' : 'text-base-content/60'}`}>
          {message}
        </p>
      </div>
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        class="hidden"
        data-file-dropzone-input="true"
        id={inputId}
        multiple
        name="file"
        type="file"
        onChange={(event: Event) => {
          const input = event.currentTarget as HTMLInputElement
          if (input.files?.length) {
            addFiles(input.files)
          }
          input.value = ''
        }}
      />
    </fieldset>
  )
}

function FileCard({
  file,
  isUploading,
  onRemove,
}: {
  file: SelectedFile
  isUploading: boolean
  onRemove: () => void
}) {
  return (
    <div class="relative aspect-square overflow-hidden rounded-box border border-base-300 bg-base-100">
      <FilePreview file={file} />
      <div class="absolute inset-x-0 bottom-0 bg-base-100/95 p-2">
        <p class="truncate text-xs font-medium" title={file.file.name}>
          {file.file.name}
        </p>
        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-base-300">
          <div
            class={`h-full rounded-full ${file.status === 'error' ? 'bg-error' : 'bg-primary'}`}
            style={`width: ${file.progress}%`}
          />
        </div>
        <p class={`mt-1 truncate text-[11px] ${file.status === 'error' ? 'text-error' : 'text-base-content/55'}`}>
          {getStatusText(file)}
        </p>
      </div>
      {file.status === 'queued' && !isUploading
        ? (
            <button
              aria-label="移除文件"
              class="btn btn-circle btn-ghost btn-xs absolute right-1 top-1 bg-base-100/80"
              type="button"
              onClick={onRemove}
            >
              <i class="icon-[ri--close-line]" />
            </button>
          )
        : null}
    </div>
  )
}

function FilePreview({ file }: { file: SelectedFile }) {
  if (file.previewKind === 'image' && file.previewUrl) {
    return (
      <img
        alt={file.file.name}
        class="h-full w-full object-cover"
        src={file.previewUrl}
      />
    )
  }

  if (file.previewKind === 'video' && file.previewUrl) {
    return (
      <video
        class="h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        src={file.previewUrl}
      />
    )
  }

  return (
    <div class="flex h-full w-full items-center justify-center bg-base-200 text-base-content/45">
      <i class="icon-[ri--file-3-line] text-5xl" />
    </div>
  )
}

function createSelectedFile(file: File): SelectedFile {
  const previewKind = getPreviewKind(file)
  return {
    file,
    id: crypto.randomUUID(),
    previewKind,
    previewUrl: previewKind === 'file' ? undefined : URL.createObjectURL(file),
    progress: 0,
    status: 'queued',
  }
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
