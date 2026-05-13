import type { UserRecord } from '../../../../../service/admin/system/user/dto'
import { useState } from 'hono/jsx'
import { getAvatarText } from '../../../../../utils/avatar'
import LazyAvatarImage from '../../../../_components/$lazy-avatar-image'
import {
  getUploadErrorMessage,
  uploadImage,
} from '../../../../_components/_utils/upload-image'

interface Props {
  user?: UserRecord
}

const help = '可直接填写 URL，也可点击头像上传后自动回填。'

export default function AvatarUploadField({ user }: Props) {
  const fieldId = user ? `avatar-upload-url-${user.id}` : 'avatar-upload-url-new'
  const [currentValue, setCurrentValue] = useState(user?.avatar ?? '')
  const [message, setMessage] = useState(help)
  const [isError, setIsError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const root = input.closest<HTMLElement>('[data-avatar-upload="true"]')
    const target = root?.querySelector<HTMLInputElement>(
      '[data-avatar-upload-target="true"]',
    )
    const file = input.files?.[0]
    if (!file) {
      return
    }

    setMessage('正在上传头像...')
    setIsError(false)
    setIsUploading(true)

    try {
      const result = await uploadImage(file, 'avatar')
      setCurrentValue(result.url)
      if (target) {
        target.value = result.url
        target.dispatchEvent(new Event('input', { bubbles: true }))
        target.dispatchEvent(new Event('change', { bubbles: true }))
      }
      setMessage('头像已上传并回填。')
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
      data-avatar-upload="true"
      data-form-field="avatar"
    >
      <label class="text-sm font-medium" for={fieldId}>
        头像 URL
      </label>
      <div class="flex min-w-0 items-center gap-3">
        <button
          aria-label="点击上传头像"
          class="group avatar shrink-0 disabled:cursor-wait disabled:opacity-70"
          disabled={isUploading}
          type="button"
          onClick={(event) => {
            (event.currentTarget as HTMLElement)
              .closest<HTMLElement>('[data-avatar-upload="true"]')
              ?.querySelector<HTMLInputElement>(
                '[data-avatar-upload-input="true"]',
              )
              ?.click()
          }}
        >
          <span class="relative h-14 w-14 overflow-hidden rounded bg-primary/80 text-white ring-1 ring-base-300">
            <LazyAvatarImage
              alt="用户头像"
              fallbackClass="text-lg font-bold text-white"
              fallbackText={getAvatarText(user)}
              src={currentValue || undefined}
            />
            <span class="absolute inset-0 flex items-center justify-center bg-base-content/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <i class="icon-[ri--camera-line] text-xl text-base-100" />
            </span>
          </span>
        </button>
        <input
          id={fieldId}
          class="input min-w-0 flex-1"
          data-avatar-upload-target="true"
          maxlength={500}
          name="avatar"
          placeholder="请选择或输入头像 URL"
          value={currentValue}
          onInput={(event) =>
            setCurrentValue((event.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        class="hidden"
        data-avatar-upload-input="true"
        type="file"
        onChange={handleFileChange}
      />
      <p
        class={`label ${isError ? 'text-error' : message === help ? '' : 'text-success'}`}
      >
        {message}
      </p>
    </div>
  )
}
