import { createRoute } from 'honox/factory'
import { getPageAlert } from '../../../-/utils/form'
import { listPaginatedRoles } from '../../../../service/admin/system/role'
import { listRoleSchema } from '../../../../service/admin/system/role/dto'
import { handleRoleAction } from './-actions'
import RolePanel from './-components/role-panel'

export const POST = createRoute(handleRoleAction)

export default createRoute(async (c) => {
  const listInput = listRoleSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const pagination = await listPaginatedRoles(c, listInput)

  return c.render(
    <RolePanel
      alert={getPageAlert(c)}
      keyword={listInput.keyword}
      pagination={pagination}
      roles={pagination.items}
      timezone={c.config.timezone}
    />,
    {
      currentMenuName: 'admin.system.role',
      pageTitle: '角色管理',
    },
  )
})
