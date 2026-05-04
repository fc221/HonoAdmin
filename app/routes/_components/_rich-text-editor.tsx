interface Props {
  label: string
  name: string
  placeholder?: string
  uploadType?: 'notification' | 'page'
  value?: string
}

const toolbarButtons = [
  { command: 'bold', icon: 'icon-[ri--bold]', label: '加粗' },
  { command: 'italic', icon: 'icon-[ri--italic]', label: '斜体' },
  { command: 'underline', icon: 'icon-[ri--underline]', label: '下划线' },
  { command: 'insertUnorderedList', icon: 'icon-[ri--list-unordered]', label: '无序列表' },
  { command: 'insertOrderedList', icon: 'icon-[ri--list-ordered]', label: '有序列表' },
  { command: 'createLink', icon: 'icon-[ri--link]', label: '链接' },
  { command: 'removeFormat', icon: 'icon-[ri--format-clear]', label: '清除格式' },
]

export default function RichTextEditor({
  label,
  name,
  placeholder = '请输入内容',
  uploadType,
  value = '',
}: Props) {
  return (
    <fieldset class="fieldset lg:col-span-2" data-form-field={name}>
      <legend class="fieldset-legend">{label}</legend>
      <div
        class="overflow-hidden rounded-box border border-base-300 bg-base-100"
        data-rich-text-editor="true"
        data-rich-text-upload-type={uploadType}
      >
        <div class="flex flex-wrap gap-1 border-b border-base-300 bg-base-200/60 p-2">
          {toolbarButtons.map((button) => (
            <button
              aria-label={button.label}
              class="btn btn-ghost btn-sm"
              data-rich-text-command={button.command}
              key={button.command}
              title={button.label}
              type="button"
            >
              <i class={button.icon} />
            </button>
          ))}
          {uploadType
            ? (
                <>
                  <button
                    aria-label="上传图片"
                    class="btn btn-ghost btn-sm"
                    data-rich-text-upload="true"
                    title="上传图片"
                    type="button"
                  >
                    <i class="icon-[ri--image-add-line]" />
                  </button>
                  <input
                    accept="image/gif,image/jpeg,image/png,image/webp"
                    class="hidden"
                    data-rich-text-upload-input="true"
                    type="file"
                  />
                  <span
                    class="self-center px-2 text-xs text-base-content/55"
                    data-rich-text-upload-message="true"
                  />
                </>
              )
            : null}
        </div>
        <div
          class="rich-text-content min-h-80 overflow-y-auto bg-base-100 p-4 text-sm leading-7 outline-none"
          contentEditable={true}
          data-placeholder={placeholder}
          data-rich-text-body="true"
          dangerouslySetInnerHTML={{ __html: value }}
        />
        <textarea
          class="hidden"
          data-rich-text-input="true"
          name={name}
        >
          {value}
        </textarea>
      </div>
      <p class="label">支持加粗、列表和链接，内容将以 HTML 保存。</p>
    </fieldset>
  )
}
