import type { PageAlertState } from '../../../../-/components/page-alert'
import type { RoleOption } from '../../../../../service/admin/system/role/dto'
import type { UserRecord } from '../../../../../service/admin/system/user/dto'
import type { PaginatedResult } from '../../../../../service/common/pagination'
import { CreateActionModal } from '../../../-components/crud-action-modal'
import PageAlert from '../../../../-/components/page-alert'
import Pagination, { createPageHref } from '../../../../-/components/pagination'
import TableSearchForm from '../../../../-/components/table-search-form'
import { ListTurboFrame } from '../../../../-/components/turbo-frame'
import UserForm from './user-form'
import UserTable from './user-table'

interface Props {
  alert?: PageAlertState
  keyword: string
  pagination: PaginatedResult<UserRecord>
  roles: RoleOption[]
  timezone: string
  users: UserRecord[]
}

export default function UserPanel({
  alert,
  keyword,
  pagination,
  roles,
  timezone,
  users,
}: Props) {
  const createModalId = 'user-create-modal'
  const listHref = createPageHref('/admin/system/user', {
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
              <CreateActionModal
                buttonLabel="新增用户"
                id={createModalId}
                title="新增用户"
              >
                <UserForm
                  cancelTargetId={createModalId}
                  mode="create"
                  returnTo={listHref}
                  roles={roles}
                />
              </CreateActionModal>
            </div>
            <TableSearchForm
              action="/admin/system/user"
              keyword={keyword}
              pageSize={pagination.pageSize}
              placeholder="用户名 / 昵称 / 手机 / 邮箱"
            />
          </div>
          <UserTable
            listHref={listHref}
            roles={roles}
            timezone={timezone}
            users={users}
          />
          <Pagination
            action="/admin/system/user"
            pagination={pagination}
            query={{ keyword, pageSize: pagination.pageSize }}
          />
        </section>
      </ListTurboFrame>
    </div>
  )
}
