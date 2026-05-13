import { createRoute } from 'honox/factory'
import { listPaginatedRoles } from '../../../../service/admin/system/role'
import { listRoleSchema } from '../../../../service/admin/system/role/dto'
import { getPageAlert } from '../../../_utils/form'
import { handleRoleAction } from './_actions'
import RolePanel from './_components/_role-panel'

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
