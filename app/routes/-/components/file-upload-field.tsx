import type { FileUploadType } from '../../../service/admin/system/file/enum'

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
  const currentValue = value ?? ''

  return (
    <div
      class="min-w-0 space-y-2"
      data-controller="file-upload-field"
      data-file-upload-field-help-value={help}
      data-file-upload-field-upload-type-value={uploadType}
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
            data-file-upload-field-target="image"
            src={currentValue || undefined}
          />
          <input
            id={`${name}-upload-url`}
            class="input min-w-0 flex-1"
            maxlength={500}
            name={name}
            placeholder={placeholder}
            data-action="input->file-upload-field#valueChanged"
            data-file-upload-field-target="valueInput"
            value={currentValue}
          />
        </div>
        <input
          accept="image/gif,image/jpeg,image/png,image/webp"
          class="file-input file-input-sm w-full"
          data-action="change->file-upload-field#upload"
          data-file-upload-field-target="fileInput"
          type="file"
        />
      </div>
      <p class="label" data-file-upload-field-target="message">
        {help}
      </p>
    </div>
  )
}
