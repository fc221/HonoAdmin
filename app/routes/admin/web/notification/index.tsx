import { createRoute } from 'honox/factory'
import { getPageAlert } from '../../../-/utils/form'
import { listWebNotifications } from '../../../../service/admin/web/notification'
import { listWebNotificationSchema } from '../../../../service/admin/web/notification/dto'
import { handleWebNotificationAction } from './-actions'
import WebNotificationPanel from './-components/notification-panel'

export const POST = createRoute(handleWebNotificationAction)

export default createRoute(async (c) => {
  const listInput = listWebNotificationSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const pagination = await listWebNotifications(c, listInput)

  return c.render(
    <WebNotificationPanel
      alert={getPageAlert(c)}
      keyword={listInput.keyword}
      notifications={pagination.items}
      pagination={pagination}
    />,
    {
      currentMenuName: 'admin.web.notification',
      pageTitle: '公告管理',
    },
  )
})
