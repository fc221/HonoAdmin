import type { FileUploadType } from '../../service/admin/system/file/enum'
import { useState } from 'hono/jsx'
import {
  getUploadErrorMessage,
  uploadImage,
} from './_utils/upload-image'

interface Props {
  help?: string
  label: string
  name: string
  placeholder?: string
  uploadType: FileUploadType
  value?: string | null
}

export default function FileUploadField({
  help = '可直接填写 URL，也可选择图片上传后自动回填。',
  label,
  name,
  placeholder = '请选择或输入图片 URL',
  uploadType,
  value,
}: Props) {
  const [currentValue, setCurrentValue] = useState(value ?? '')
  const [message, setMessage] = useState(help)
  const [isError, setIsError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const root = input.closest<HTMLElement>('[data-file-upload-field="true"]')
    const target = root?.querySelector<HTMLInputElement>(
      '[data-file-upload-target="true"]',
    )
    const file = input.files?.[0]
    if (!file) {
      return
    }

    setMessage('正在上传图片...')
    setIsError(false)
    setIsUploading(true)

    try {
      const result = await uploadImage(file, uploadType)
      setCurrentValue(result.url)
      if (target) {
        target.value = result.url
        target.dispatchEvent(new Event('input', { bubbles: true }))
        target.dispatchEvent(new Event('change', { bubbles: true }))
      }
      setMessage('图片已上传并回填。')
      setIsError(false)
    } catch (error) {
      setMessage(getUploadErrorMessage(error))
      setIsError(true)
    } finally {
      input.value = ''
      setIsUploading(false)
    }
  }

  return (
    <div
      class="min-w-0 space-y-2"
      data-file-upload-field="true"
      data-form-field={name}
    >
      <label class="text-sm font-medium" for={`${name}-upload-url`}>
        {label}
      </label>
      <div class="flex min-w-0 flex-col gap-3">
        <div class="flex min-w-0 flex-wrap items-center gap-3">
          <img
            alt={label}
            class={`h-14 w-14 shrink-0 rounded object-cover ${currentValue ? '' : 'hidden'}`}
            src={currentValue || undefined}
          />
          <input
            id={`${name}-upload-url`}
            class="input min-w-0 flex-1"
            maxlength={500}
            name={name}
            placeholder={placeholder}
            data-file-upload-target="true"
            value={currentValue}
            onInput={(event) =>
              setCurrentValue((event.currentTarget as HTMLInputElement).value)}
          />
        </div>
        <input
          accept="image/gif,image/jpeg,image/png,image/webp"
          class="file-input file-input-sm w-full"
          disabled={isUploading}
          type="file"
          onChange={handleFileChange}
        />
      </div>
      <p class={`label ${isError ? 'text-error' : message === help ? '' : 'text-success'}`}>
        {message}
      </p>
    </div>
  )
}
