import type { PageAlertState } from '../../../../-/components/page-alert'
import type { WebNotificationRecord } from '../../../../../service/admin/web/notification/dto'
import type {
  PaginatedResult,
} from '../../../../../service/common/pagination'
import PageAlert from '../../../../-/components/page-alert'
import Pagination, { createPageHref } from '../../../../-/components/pagination'
import TableSearchForm from '../../../../-/components/table-search-form'
import { ListTurboFrame } from '../../../../-/components/turbo-frame'
import { withReturnToPath } from '../../../../-/utils/form'
import WebNotificationTable from './notification-table'

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
  const listHref = createPageHref('/admin/web/notification', {
    keyword,
    pageSize: pagination.pageSize,
  }, pagination.page)

  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <ListTurboFrame>
        <section class="rounded-box border border-base-300 bg-base-100 p-4">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <a
                class="btn btn-primary btn-sm"
                data-turbo-frame="_top"
                href={withReturnToPath('/admin/web/notification/add', listHref)}
              >
                <i class="icon-[ri--add-line]" />
                新增公告
              </a>
            </div>
            <TableSearchForm
              action="/admin/web/notification"
              keyword={keyword}
              pageSize={pagination.pageSize}
              placeholder="标题 / 别名"
            />
          </div>
          <WebNotificationTable
            listHref={listHref}
            notifications={notifications}
          />
          <Pagination
            action="/admin/web/notification"
            pagination={pagination}
            query={{ keyword, pageSize: pagination.pageSize }}
          />
        </section>
      </ListTurboFrame>
    </div>
  )
}
