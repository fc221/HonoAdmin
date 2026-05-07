import type { WebPageRecord } from '../../../../../service/admin/web/page/dto'
import type { PaginatedResult } from '../../../../../service/common/pagination'
import type { PageAlertState } from '../../../../_components/_page-alert'
import PageAlert from '../../../../_components/_page-alert'
import Pagination from '../../../../_components/_pagination'
import TableSearchForm from '../../../../_components/_table-search-form'
import WebPageTable from './_page-table'

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
  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <a
              class="btn btn-primary btn-sm"
              data-pjax="true"
              href="/admin/web/page/add"
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
        <WebPageTable pages={pages} />
        <Pagination
          action="/admin/web/page"
          pagination={pagination}
          query={{ keyword, pageSize: pagination.pageSize }}
        />
      </section>
    </div>
  )
}
