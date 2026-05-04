import type {
  OperateLogRecord,
  OperateLogType,
  PaginatedResult,
} from '../../../../../service'
import type { PageAlertState } from '../../../../_components/_page-alert'
import {
  operateLogTypeLabels,
  operateLogTypeOptions,
} from '../../../../../service'
import { formatDateTime } from '../../../../../utils'
import PageAlert from '../../../../_components/_page-alert'
import Pagination from '../../../../_components/_pagination'
import { ConfirmActionModal } from '../../../_components/_crud-action-modal'

interface Props {
  alert?: PageAlertState
  keyword: string
  logs: OperateLogRecord[]
  logType: OperateLogType | ''
  pagination: PaginatedResult<OperateLogRecord>
  timezone: string
}

export default function OperateLogPanel({
  alert,
  keyword,
  logs,
  logType,
  pagination,
  timezone,
}: Props) {
  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <ConfirmActionModal
              buttonClass="btn btn-ghost btn-sm text-error"
              buttonLabel="清空日志"
              confirmLabel="确认清空"
              id="operate-log-clear"
              inputs={[{ name: 'intent', value: 'clear' }]}
              message="清空后将删除当前所有操作日志记录。"
              title="清空操作日志"
            />
          </div>
          <OperateLogFilterForm
            keyword={keyword}
            logType={logType}
            pageSize={pagination.pageSize}
          />
        </div>
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>类型</th>
                <th>状态</th>
                <th>信息</th>
                <th>请求</th>
                <th>IP</th>
                <th>时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.userId ?? '-'}</td>
                  <td>
                    {log.logType ? operateLogTypeLabels[log.logType] : '-'}
                  </td>
                  <td>{log.status}</td>
                  <td class="min-w-64 whitespace-pre-wrap">
                    {log.logMsg ?? log.errorMsg ?? '-'}
                  </td>
                  <td>
                    <div class="flex min-w-40 flex-col gap-1">
                      <span>{log.requestMethod ?? '-'}</span>
                      <span class="text-xs text-base-content/50">
                        {log.method ?? '-'}
                      </span>
                    </div>
                  </td>
                  <td>{log.clientIp ?? '-'}</td>
                  <td>{formatDateTime(log.createdAt, timezone)}</td>
                  <td>
                    <ConfirmActionModal
                      id={`operate-log-delete-${log.id}`}
                      inputs={[
                        { name: 'intent', value: 'delete' },
                        { name: 'id', value: log.id },
                      ]}
                      message={`操作日志 #${log.id} 删除后不可恢复。`}
                      title="删除操作日志"
                    />
                  </td>
                </tr>
              ))}
              {logs.length === 0
                ? (
                    <tr>
                      <td class="text-base-content/60" colspan={9}>
                        暂无日志。
                      </td>
                    </tr>
                  )
                : null}
            </tbody>
          </table>
        </div>
        <Pagination
          action="/admin/system/operate-log"
          pagination={pagination}
          query={{ keyword, logType, pageSize: pagination.pageSize }}
        />
      </section>
    </div>
  )
}

function OperateLogFilterForm({
  keyword,
  logType,
  pageSize,
}: {
  keyword: string
  logType: OperateLogType | ''
  pageSize: number
}) {
  return (
    <form
      action="/admin/system/operate-log"
      class="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto"
      data-pjax="true"
      data-pjax-replace="true"
      method="get"
    >
      <input name="pageSize" type="hidden" value={pageSize} />
      <select class="select select-bordered select-sm w-full sm:w-36" name="logType">
        <option selected={logType === ''} value="">全部类型</option>
        {operateLogTypeOptions.map((option) => (
          <option
            key={option.value}
            selected={logType === option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      <label class="input input-bordered input-sm flex w-full max-w-xs items-center gap-2 sm:w-64">
        <i class="icon-[ri--search-line] text-base-content/45"></i>
        <input
          class="grow"
          name="keyword"
          placeholder="关键词搜索"
          type="search"
          value={keyword}
        />
      </label>
      <button class="btn btn-primary btn-sm" type="submit">
        搜索
      </button>
    </form>
  )
}
