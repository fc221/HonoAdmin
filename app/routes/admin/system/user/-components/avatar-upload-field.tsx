import type { UserRecord } from '../../../../../service/admin/system/user/dto'
import LazyAvatarImage from '../../../../-/components/lazy-avatar-image'
import { getAvatarText } from '../../../../../utils/avatar'

interface Props {
  user?: UserRecord
}

const help = '可直接填写 URL，也可点击头像上传后自动回填。'

export default function AvatarUploadField({ user }: Props) {
  const fieldId = user ? `avatar-upload-url-${user.id}` : 'avatar-upload-url-new'
  const currentValue = user?.avatar ?? ''

  return (
    <div
      class="min-w-0 space-y-2"
      data-avatar-upload="true"
      data-avatar-upload-pending-message-value="正在上传头像..."
      data-avatar-upload-success-message-value="头像已上传并回填。"
      data-controller="avatar-upload"
      data-form-field="avatar"
    >
      <label class="text-sm font-medium" for={fieldId}>
        头像 URL
      </label>
      <div class="flex min-w-0 items-center gap-3">
        <button
          aria-label="点击上传头像"
          class="group avatar shrink-0 disabled:cursor-wait disabled:opacity-70"
          data-action="avatar-upload#choose"
          data-avatar-upload-target="button"
          type="button"
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
          data-action="input->avatar-upload#valueChanged"
          data-avatar-upload-target="valueInput"
          maxlength={500}
          name="avatar"
          placeholder="请选择或输入头像 URL"
          value={currentValue}
        />
      </div>
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        class="hidden"
        data-action="change->avatar-upload#upload"
        data-avatar-upload-target="fileInput"
        type="file"
      />
      <p
        class="label"
        data-avatar-upload-target="message"
      >
        {help}
      </p>
    </div>
  )
}
