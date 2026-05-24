import type { UserRecord } from '../../../../service/admin/system/user/dto'
import LazyAvatarImage from '../../../-/components/lazy-avatar-image'
import { getAvatarText } from '../../../../utils/avatar'

export default function AvatarUploadField({ user }: { user: UserRecord }) {
  const currentValue = user.avatar ?? ''

  return (
    <div
      class="space-y-2"
      data-avatar-upload="true"
      data-avatar-upload-pending-message-value="正在上传图片..."
      data-avatar-upload-success-message-value="头像已上传。"
      data-controller="avatar-upload"
      data-form-field="avatar"
    >
      <input
        data-action="input->avatar-upload#valueChanged"
        data-avatar-upload-target="valueInput"
        name="avatar"
        type="hidden"
        value={currentValue}
      />
      <button
        aria-label="上传头像"
        class="group flex w-fit items-center gap-4 rounded-box p-2 text-left hover:bg-base-200 disabled:cursor-wait disabled:opacity-70"
        data-action="avatar-upload#choose"
        data-avatar-upload-target="button"
        type="button"
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
        data-action="change->avatar-upload#upload"
        data-avatar-upload-target="fileInput"
        type="file"
      />
      <p
        class="label hidden"
        data-avatar-upload-target="message"
        hidden
      >
      </p>
    </div>
  )
}
