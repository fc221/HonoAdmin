import { createRoute } from 'honox/factory'
import { listRoleOptions } from '../../../../service/admin/system/role'
import { listUsers } from '../../../../service/admin/system/user'
import { listUserSchema } from '../../../../service/admin/system/user/dto'
import { getPageAlert } from '../../../_utils/form'
import { handleUserAction } from './_actions'
import UserPanel from './_components/_user-panel'

export const POST = createRoute(handleUserAction)

export default createRoute(async (c) => {
  const listInput = listUserSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const timezone = c.config.timezone
  const [pagination, roles] = await Promise.all([
    listUsers(c, listInput),
    listRoleOptions(c),
  ])

  return c.render(
    <UserPanel
      alert={getPageAlert(c)}
      keyword={listInput.keyword}
      pagination={pagination}
      roles={roles}
      timezone={timezone}
      users={pagination.items}
    />,
    {
      currentMenuName: 'admin.system.user',
      pageTitle: '用户管理',
    },
  )
})
