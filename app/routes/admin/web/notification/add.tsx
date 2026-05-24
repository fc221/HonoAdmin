import { createRoute } from 'honox/factory'
import PageAlert from '../../../-/components/page-alert'
import PageHeader from '../../../-/components/page-header'
import {
  getPageAlert,
  getQueryReturnPath,
} from '../../../-/utils/form'
import { handleWebNotificationCreateAction } from './-actions'
import WebNotificationForm from './-components/notification-form'

export const POST = createRoute(handleWebNotificationCreateAction)

export default createRoute(async (c) => {
  const returnTo = getQueryReturnPath(c, '/admin/web/notification')

  return c.render(
    <>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <PageHeader
          backHref="/admin/web/notification"
          description="填写公告基础信息和富文本内容。"
          title="新增公告"
        />
        <WebNotificationForm mode="create" returnTo={returnTo} />
      </section>
    </>,
    {
      currentMenuName: 'admin.web.notification',
      pageTitle: '新增公告',
    },
  )
})
