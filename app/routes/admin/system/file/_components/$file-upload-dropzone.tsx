import { useState } from 'hono/jsx'

const emptySummary = '暂未选择文件'
const inputId = 'file-upload-input'

export default function FileUploadDropzone() {
  const [summary, setSummary] = useState(emptySummary)
  const [isDragging, setIsDragging] = useState(false)

  const updateSummary = (files: FileList | null | undefined) => {
    const items = [...(files ?? [])]

    if (!items.length) {
      setSummary(emptySummary)
      return
    }

    const fileNames = items.slice(0, 3).map((file) => file.name).join('、')
    const suffix = items.length > 3 ? ` 等 ${items.length} 个文件` : ''
    setSummary(`已选择 ${items.length} 个文件：${fileNames}${suffix}`)
  }

  const handleDrop = (event: DragEvent) => {
    const files = event.dataTransfer?.files
    const input = (event.currentTarget as HTMLElement)
      .closest('fieldset')
      ?.querySelector<HTMLInputElement>('[data-file-dropzone-input="true"]')
    if (!files?.length || !input) {
      return
    }

    event.preventDefault()
    setIsDragging(false)
    input.files = files
    updateSummary(files)
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  return (
    <fieldset class="fieldset">
      <legend class="fieldset-legend">图片文件</legend>
      <label
        class={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-box border border-dashed px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/5 ${isDragging ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200/35'}`}
        for={inputId}
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
        <i class="icon-[ri--upload-cloud-2-line] text-4xl text-primary" />
        <span class="font-medium">拖入图片，或点击选择文件</span>
        <span class="text-sm text-base-content/55">
          支持 JPG、PNG、WEBP、GIF，可一次选择多张。
        </span>
        <span class="text-sm text-base-content/70">{summary}</span>
      </label>
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        class="file-input mt-3 w-full"
        data-validate-trigger="change"
        data-file-dropzone-input="true"
        id={inputId}
        multiple
        name="file"
        required
        type="file"
        onChange={(event: Event) =>
          updateSummary((event.currentTarget as HTMLInputElement).files)}
      />
    </fieldset>
  )
}
