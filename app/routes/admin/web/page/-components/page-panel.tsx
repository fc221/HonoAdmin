import type { PageAlertState } from '../../../../-/components/page-alert'
import type { WebPageRecord } from '../../../../../service/admin/web/page/dto'
import type { PaginatedResult } from '../../../../../service/common/pagination'
import PageAlert from '../../../../-/components/page-alert'
import Pagination, { createPageHref } from '../../../../-/components/pagination'
import TableSearchForm from '../../../../-/components/table-search-form'
import { ListTurboFrame } from '../../../../-/components/turbo-frame'
import { withReturnToPath } from '../../../../-/utils/form'
import WebPageTable from './page-table'

interface Props {
  alert?: PageAlertState
  keyword: string
  pages: WebPageRecord[]
  pagination: PaginatedResult<WebPageRecord>
}

export default function WebPagePanel({
  alert,
  keyword,
  pages,
  pagination,
}: Props) {
  const listHref = createPageHref('/admin/web/page', {
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
                href={withReturnToPath('/admin/web/page/add', listHref)}
              >
                <i class="icon-[ri--add-line]" />
                新增页面
              </a>
            </div>
            <TableSearchForm
              action="/admin/web/page"
              keyword={keyword}
              pageSize={pagination.pageSize}
              placeholder="标题 / 别名 / 分类"
            />
          </div>
          <WebPageTable listHref={listHref} pages={pages} />
          <Pagination
            action="/admin/web/page"
            pagination={pagination}
            query={{ keyword, pageSize: pagination.pageSize }}
          />
        </section>
      </ListTurboFrame>
    </div>
  )
}
