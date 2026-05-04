import { createRoute } from 'honox/factory'
import {
  listWebNotifications,
  listWebNotificationSchema,
} from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleWebNotificationAction } from './_actions'
import WebNotificationPanel from './_components/_notification-panel'

export const POST = createRoute(handleWebNotificationAction)

export default createRoute(async (c) => {
  const listInput = listWebNotificationSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const [pagination, layout] = await Promise.all([
    listWebNotifications(c, listInput),
    getAdminLayoutData(c),
  ])

  return c.render(
    <Layout
      currentMenuName="admin.web.notification"
      menus={layout.menus}
      user={layout.user}
    >
      <title>公告管理 - HonoAdmin</title>
      <WebNotificationPanel
        alert={getPageAlert(c)}
        keyword={listInput.keyword}
        notifications={pagination.items}
        pagination={pagination}
      />
    </Layout>,
  )
})
