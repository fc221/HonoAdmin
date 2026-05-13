import type { UserRecord } from '../../../../service/admin/system/user/dto'
import { useState } from 'hono/jsx'
import { getAvatarText } from '../../../../utils/avatar'
import LazyAvatarImage from '../../../_components/$lazy-avatar-image'
import {
  getUploadErrorMessage,
  uploadImage,
} from '../../../_components/_utils/upload-image'

export default function AvatarUploadField({ user }: { user: UserRecord }) {
  const [currentValue, setCurrentValue] = useState(user.avatar ?? '')
  const [message, setMessage] = useState('')
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

    setMessage('正在上传图片...')
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
      setMessage('头像已上传。')
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
      class="space-y-2"
      data-avatar-upload="true"
      data-form-field="avatar"
    >
      <input
        data-avatar-upload-target="true"
        name="avatar"
        type="hidden"
        value={currentValue}
      />
      <button
        aria-label="上传头像"
        class="group flex w-fit items-center gap-4 rounded-box p-2 text-left hover:bg-base-200 disabled:cursor-wait disabled:opacity-70"
        disabled={isUploading}
        type="button"
        onClick={(event) => {
          (event.currentTarget as HTMLElement)
            .closest<HTMLElement>('[data-avatar-upload="true"]')
            ?.querySelector<HTMLInputElement>('[data-avatar-upload-input="true"]')
            ?.click()
        }}
      >
        <span class="avatar">
          <span class="relative h-20 w-20 overflow-hidden rounded-full bg-primary/80 ring ring-base-300 ring-offset-2 ring-offset-base-100">
            <LazyAvatarImage
              alt="用户头像"
              fallbackClass="text-2xl font-bold text-white"
              fallbackText={getAvatarText(user)}
              src={currentValue || undefined}
            />
            <span class="absolute inset-x-0 bottom-0 bg-base-content/70 py-1 text-center text-xs text-base-100 opacity-0 transition-opacity group-hover:opacity-100">
              上传
            </span>
          </span>
        </span>
        <span>
          <span class="block text-sm font-medium">头像</span>
          <span class="mt-1 block text-xs text-base-content/60">
            点击头像上传图片
          </span>
        </span>
      </button>
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        class="hidden"
        data-avatar-upload-input="true"
        type="file"
        onChange={handleFileChange}
      />
      {message
        ? (
            <p class={`label ${isError ? 'text-error' : 'text-success'}`}>
              {message}
            </p>
          )
        : null}
    </div>
  )
}
