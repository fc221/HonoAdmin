import { createRoute } from 'honox/factory'
import { getPageAlert } from '../../../-/utils/form'
import { getAdminSessionUser } from '../../../../service/admin/session'
import { getUpdateStatus } from '../../../../service/admin/system/update'
import { handleUpdateAction } from './-actions'
import UpdatePanel from './-components/update-panel'

export const POST = createRoute(handleUpdateAction)

export default createRoute(async (c) => {
  const [user, status] = await Promise.all([
    getAdminSessionUser(c),
    getUpdateStatus(c),
  ])

  return c.render(
    <UpdatePanel
      alert={getPageAlert(c)}
      canMigrate={!!user?.isRoot}
      status={status}
    />,
    {
      currentMenuName: 'admin.system.update',
      pageTitle: '更新管理',
    },
  )
})
