import type { PageAlertState } from '../../../../-/components/page-alert'
import type {
  FileRecord,
} from '../../../../../service/admin/system/file/dto'
import type { FileUploadType } from '../../../../../service/admin/system/file/enum'
import type { PaginatedResult } from '../../../../../service/common/pagination'
import {
  ConfirmActionModal,
  CreateActionModal,
} from '../../../-components/crud-action-modal'
import PageAlert from '../../../../-/components/page-alert'
import Pagination, { createPageHref } from '../../../../-/components/pagination'
import {
  ListTurboFrame,
  topLevelFormTurboAttrs,
} from '../../../../-/components/turbo-frame'
import { returnToFieldName } from '../../../../-/utils/form'
import {
  fileStorageModeLabels,
  fileUploadTypeLabels,
  fileUploadTypeOptions,
} from '../../../../../service/admin/system/file/enum'
import { formatDateTime } from '../../../../../utils/datetime'
import FileUploadDropzone from './file-upload-dropzone'

interface Props {
  alert?: PageAlertState
  files: FileRecord[]
  keyword: string
  pagination: PaginatedResult<FileRecord>
  timezone: string
  uploadType: FileUploadType | ''
}

const pagePath = '/admin/system/file'
const uploadModalId = 'file-upload-modal'

export default function FilePanel({
  alert,
  files,
  keyword,
  pagination,
  timezone,
  uploadType,
}: Props) {
  const listHref = createPageHref(pagePath, {
    keyword,
    pageSize: pagination.pageSize,
    uploadType,
  }, pagination.page)

  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <ListTurboFrame>
        <section class="rounded-box border border-base-300 bg-base-100 p-4">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <CreateActionModal
              buttonLabel="上传文件"
              iconClass="icon-[ri--upload-cloud-2-line]"
              id={uploadModalId}
              title="上传文件"
            >
              <UploadForm modalId={uploadModalId} />
            </CreateActionModal>
            <FileFilterForm
              keyword={keyword}
              pageSize={pagination.pageSize}
              uploadType={uploadType}
            />
          </div>
          <FileTable files={files} listHref={listHref} timezone={timezone} />
          <Pagination
            action={pagePath}
            pagination={pagination}
            query={{
              keyword,
              pageSize: pagination.pageSize,
              uploadType,
            }}
          />
        </section>
      </ListTurboFrame>
    </div>
  )
}

function UploadForm({ modalId }: { modalId: string }) {
  return (
    <form
      class="space-y-5"
      enctype="multipart/form-data"
      method="post"
      {...topLevelFormTurboAttrs}
    >
      <input name="intent" type="hidden" value="upload" />
      <fieldset class="fieldset">
        <legend class="fieldset-legend">上传类型</legend>
        <select class="select w-full" name="uploadType">
          {fileUploadTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </fieldset>
      <FileUploadDropzone />
      <div class="modal-action border-t border-base-300 pt-4">
        <label
          class="btn btn-ghost btn-sm"
          for={modalId}
          role="button"
          tabindex={0}
        >
          取消
        </label>
        <button class="btn btn-primary btn-sm" type="submit">
          确认上传
        </button>
      </div>
    </form>
  )
}

function FileFilterForm({
  keyword,
  pageSize,
  uploadType,
}: {
  keyword: string
  pageSize: number
  uploadType: FileUploadType | ''
}) {
  return (
    <form
      action={pagePath}
      class="flex flex-wrap items-center justify-start gap-2 xl:justify-end"
      data-turbo="true"
      data-turbo-action="replace"
      data-turbo-frame="admin-list-frame"
      method="get"
    >
      <input name="pageSize" type="hidden" value={pageSize} />
      <select class="select select-sm w-40" name="uploadType" value={uploadType}>
        <option selected={uploadType === ''} value="">
          全部类型
        </option>
        {fileUploadTypeOptions.map((option) => (
          <option
            key={option.value}
            selected={uploadType === option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      <input
        class="input input-sm w-56"
        name="keyword"
        placeholder="文件名 / 存储键 / MIME"
        value={keyword}
      />
      <button class="btn btn-primary btn-sm" type="submit">
        <i class="icon-[ri--search-line]" />
        搜索
      </button>
    </form>
  )
}

function FileTable({
  files,
  listHref,
  timezone,
}: {
  files: FileRecord[]
  listHref: string
  timezone: string
}) {
  return (
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th class="w-20 min-w-20">预览</th>
            <th>文件</th>
            <th>类型</th>
            <th>存储</th>
            <th>上传用户</th>
            <th class="w-52 min-w-52">上传时间</th>
            <th class="text-right w-20 min-w-20"></th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>{file.id}</td>
              <td>
                <FilePreviewCell file={file} />
              </td>
              <td>
                <div class="flex min-w-64 flex-col gap-1">
                  <a
                    class="link link-primary font-medium"
                    href={file.url}
                    target="_blank"
                  >
                    {file.originalName}
                  </a>
                  <span class="font-mono text-xs text-base-content/55">
                    {file.storageKey}
                  </span>
                  <span class="text-xs text-base-content/55">
                    {file.mimeType}
                    {' / '}
                    {formatFileSize(file.fileSize)}
                  </span>
                </div>
              </td>
              <td>
                <span class="badge badge-soft badge-primary whitespace-nowrap">
                  {fileUploadTypeLabels[file.uploadType]}
                </span>
              </td>
              <td>
                <span class="badge badge-soft whitespace-nowrap">
                  {fileStorageModeLabels[file.storageMode]}
                </span>
              </td>
              <td>{file.userId ?? '-'}</td>
              <td>{formatDateTime(file.createdAt, timezone)}</td>
              <td class="text-right">
                <ConfirmActionModal
                  id={`file-delete-${file.id}`}
                  inputs={[
                    { name: 'intent', value: 'delete' },
                    { name: 'id', value: file.id },
                    { name: returnToFieldName, value: listHref },
                  ]}
                  message={`文件「${file.originalName}」删除后，已引用该文件的头像、公告或页面内容将无法显示。`}
                  title="删除文件"
                />
              </td>
            </tr>
          ))}
          {files.length === 0
            ? (
                <tr>
                  <td class="text-base-content/60" colspan={8}>
                    暂无文件。
                  </td>
                </tr>
              )
            : null}
        </tbody>
      </table>
    </div>
  )
}

function FilePreviewCell({ file }: { file: FileRecord }) {
  if (file.mimeType.startsWith('image/')) {
    return (
      <a href={file.url} target="_blank">
        <img
          alt={file.originalName}
          class="h-12 w-12 rounded object-cover"
          loading="lazy"
          src={file.url}
        />
      </a>
    )
  }

  if (file.mimeType.startsWith('video/')) {
    return (
      <a href={file.url} target="_blank">
        <video
          class="h-12 w-12 rounded bg-base-200 object-cover"
          muted
          playsInline
          preload="metadata"
          src={file.url}
        />
      </a>
    )
  }

  return (
    <a
      class="flex h-12 w-12 items-center justify-center rounded bg-base-200 text-base-content/45"
      href={file.url}
      target="_blank"
    >
      <i class="icon-[ri--file-3-line] text-2xl" />
    </a>
  )
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
