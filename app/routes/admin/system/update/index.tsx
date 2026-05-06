import { createRoute } from 'honox/factory'
import {
  getAdminSessionUser,
  getUpdateStatus,
} from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleUpdateAction } from './_actions'
import UpdatePanel from './_components/_update-panel'

export const POST = createRoute(handleUpdateAction)

export default createRoute(async (c) => {
  const user = await getAdminSessionUser(c)
  const [layout, status] = await Promise.all([
    getAdminLayoutData(c),
    getUpdateStatus(c),
  ])

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.system.update"
      menus={layout.menus}
      user={layout.user}
    >
      <title>更新管理 - HonoAdmin</title>
      <UpdatePanel
        alert={getPageAlert(c)}
        canMigrate={!!user?.isRoot}
        status={status}
      />
    </Layout>,
  )
})
