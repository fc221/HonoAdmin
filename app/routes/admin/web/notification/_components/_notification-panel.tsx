import type {
  PaginatedResult,
  WebNotificationRecord,
} from '../../../../../service'
import type { PageAlertState } from '../../../../_components/_page-alert'
import PageAlert from '../../../../_components/_page-alert'
import Pagination from '../../../../_components/_pagination'
import TableSearchForm from '../../../../_components/_table-search-form'
import WebNotificationTable from './_notification-table'

interface Props {
  alert?: PageAlertState
  keyword: string
  notifications: WebNotificationRecord[]
  pagination: PaginatedResult<WebNotificationRecord>
}

export default function WebNotificationPanel({
  alert,
  keyword,
  notifications,
  pagination,
}: Props) {
  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <a
              class="btn btn-primary btn-sm"
              data-pjax="true"
              href="/admin/web/notification/add"
            >
              <i class="icon-[ri--add-line]" />
              新增公告
            </a>
          </div>
          <TableSearchForm
            action="/admin/web/notification"
            keyword={keyword}
            pageSize={pagination.pageSize}
          />
        </div>
        <WebNotificationTable notifications={notifications} />
        <Pagination
          action="/admin/web/notification"
          pagination={pagination}
          query={{ keyword, pageSize: pagination.pageSize }}
        />
      </section>
    </div>
  )
}
