import type { RoleRecord } from '../../../../../service/admin/system/role/dto'
import type { PaginatedResult } from '../../../../../service/common/pagination'
import type { PageAlertState } from '../../../../_components/_page-alert'
import { formatDateTime } from '../../../../../utils/datetime'
import PageAlert from '../../../../_components/_page-alert'
import Pagination from '../../../../_components/_pagination'
import TableSearchForm from '../../../../_components/_table-search-form'
import { ConfirmActionModal } from '../../../_components/_crud-action-modal'

interface Props {
  alert?: PageAlertState
  keyword: string
  pagination: PaginatedResult<RoleRecord>
  roles: RoleRecord[]
  timezone: string
}

const pagePath = '/admin/system/role'

export default function RolePanel({
  alert,
  keyword,
  pagination,
  roles,
  timezone,
}: Props) {
  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <a class="btn btn-primary btn-sm" data-pjax="true" href={`${pagePath}/add`}>
            <i class="icon-[ri--add-line]"></i>
            新增角色
          </a>
          <TableSearchForm
            action={pagePath}
            keyword={keyword}
            pageSize={pagination.pageSize}
            placeholder="角色名 / 编码"
          />
        </div>
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>角色</th>
                <th>权限</th>
                <th>更新时间</th>
                <th class="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.id}</td>
                  <td>
                    <div class="flex min-w-52 flex-col gap-1">
                      <span class="font-medium">{role.name}</span>
                      <span class="font-mono text-xs text-base-content/55">
                        {role.code}
                      </span>
                      {role.description
                        ? (
                            <span class="text-xs text-base-content/55">
                              {role.description}
                            </span>
                          )
                        : null}
                    </div>
                  </td>
                  <td>
                    <div class="flex min-w-48 flex-wrap gap-2">
                      <span class="badge badge-soft badge-primary">
                        菜单
                        {role.menuNames.length}
                      </span>
                      <span class="badge badge-soft badge-info">
                        操作
                        {role.permissionCodes.length}
                      </span>
                    </div>
                  </td>
                  <td>{formatDateTime(role.updatedAt, timezone)}</td>
                  <td class="text-right">
                    <div class="flex flex-nowrap items-center justify-end gap-2">
                      <a
                        class="btn btn-link btn-xs"
                        data-pjax="true"
                        href={`${pagePath}/edit?id=${role.id}`}
                      >
                        编辑
                      </a>
                      <ConfirmActionModal
                        id={`role-delete-${role.id}`}
                        inputs={[
                          { name: 'intent', value: 'delete' },
                          { name: 'id', value: role.id },
                        ]}
                        message={`角色「${role.name}」删除后不可恢复。`}
                        title="删除角色"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0
                ? (
                    <tr>
                      <td class="text-base-content/60" colspan={5}>
                        暂无角色。
                      </td>
                    </tr>
                  )
                : null}
            </tbody>
          </table>
        </div>
        <Pagination
          action={pagePath}
          pagination={pagination}
          query={{ keyword, pageSize: pagination.pageSize }}
        />
      </section>
    </div>
  )
}
