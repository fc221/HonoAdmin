import { createRoute } from 'honox/factory'
import { listRoleOptions, listUsers, listUserSchema } from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
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
  const [pagination, layout, roles] = await Promise.all([
    listUsers(c, listInput),
    getAdminLayoutData(c),
    listRoleOptions(c),
  ])

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.system.user"
      menus={layout.menus}
      user={layout.user}
    >
      <title>用户管理 - HonoAdmin</title>
      <UserPanel
        alert={getPageAlert(c)}
        keyword={listInput.keyword}
        pagination={pagination}
        roles={roles}
        timezone={timezone}
        users={pagination.items}
      />
    </Layout>,
  )
})
