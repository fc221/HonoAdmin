import { createRoute } from 'honox/factory'
import PageAlert from '../../../_components/$page-alert'
import PageHeader from '../../../_components/_page-header'
import { getPageAlert } from '../../../_utils/form'
import { handleWebNotificationCreateAction } from './_actions'
import WebNotificationForm from './_components/_notification-form'

export const POST = createRoute(handleWebNotificationCreateAction)

export default createRoute(async (c) => {
  return c.render(
    <>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <PageHeader
          backHref="/admin/web/notification"
          description="填写公告基础信息和富文本内容。"
          title="新增公告"
        />
        <WebNotificationForm mode="create" />
      </section>
    </>,
    {
      currentMenuName: 'admin.web.notification',
      pageTitle: '新增公告',
    },
  )
})
