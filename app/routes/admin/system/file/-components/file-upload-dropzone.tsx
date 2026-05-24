const inputId = 'file-upload-input'

export default function FileUploadDropzone() {
  return (
    <fieldset
      class="fieldset"
      data-action="change->file-dropzone#inputChanged"
      data-controller="file-dropzone"
      data-file-dropzone-root="true"
    >
      <legend class="fieldset-legend">上传文件</legend>
      <div
        class="rounded-box border border-dashed p-4 transition-colors border-base-300 bg-base-200/35"
        data-action="dragleave->file-dropzone#dragLeave dragover->file-dropzone#dragOver drop->file-dropzone#drop"
        data-file-dropzone-target="dropArea"
      >
        <div
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          data-file-dropzone-target="grid"
        >
          <label
            class="aspect-square cursor-pointer rounded-box border border-dashed border-base-300 bg-base-100 transition-colors hover:border-primary hover:bg-primary/5"
            data-action="click->file-dropzone#choose"
            data-file-dropzone-target="addLabel"
            for={inputId}
          >
            <span class="flex h-full flex-col items-center justify-center gap-2 text-base-content/65">
              <i class="icon-[ri--add-line] text-4xl text-primary" />
              <span class="text-sm font-medium">添加文件</span>
            </span>
          </label>
        </div>
        <p
          class="mt-3 text-sm text-base-content/60"
          data-file-dropzone-target="message"
        >
          可拖拽文件到卡片区域，或点击加号继续添加。
        </p>
      </div>
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        class="hidden"
        data-file-dropzone-input="true"
        data-file-dropzone-target="input"
        id={inputId}
        multiple
        name="file"
        type="file"
      />
    </fieldset>
  )
}
