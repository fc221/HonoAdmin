import type {
  PaginatedResult,
  RoleOption,
  UserRecord,
} from '../../../../../service'
import type { PageAlertState } from '../../../../_components/_page-alert'
import PageAlert from '../../../../_components/_page-alert'
import Pagination from '../../../../_components/_pagination'
import TableSearchForm from '../../../../_components/_table-search-form'
import { CreateActionModal } from '../../../_components/_crud-action-modal'
import UserForm from './_user-form'
import UserTable from './_user-table'

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

  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
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
        <UserTable roles={roles} timezone={timezone} users={users} />
        <Pagination
          action="/admin/system/user"
          pagination={pagination}
          query={{ keyword, pageSize: pagination.pageSize }}
        />
      </section>
    </div>
  )
}
