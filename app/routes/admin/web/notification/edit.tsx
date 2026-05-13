import { createRoute } from 'honox/factory'
import { getWebNotificationById } from '../../../../service/admin/web/notification'
import { idParamSchema } from '../../../../service/common/response'
import PageAlert from '../../../_components/$page-alert'
import PageHeader from '../../../_components/_page-header'
import {
  getActionErrorMessage,
  getPageAlert,
  redirectWithAlert,
} from '../../../_utils/form'
import { handleWebNotificationUpdateAction } from './_actions'
import WebNotificationForm from './_components/_notification-form'

const pagePath = '/admin/web/notification'

export const POST = createRoute(handleWebNotificationUpdateAction)

export default createRoute(async (c) => {
  try {
    const id = idParamSchema.parse({ id: c.req.query('id') }).id
    const notification = await getWebNotificationById(c, id)

    return c.render(
      <>
        <PageAlert alert={getPageAlert(c)} />
        <section class="rounded-box border border-base-300 bg-base-100 p-4">
          <PageHeader
            backHref={pagePath}
            description="更新公告基础信息和富文本内容。"
            title="编辑公告"
          />
          <WebNotificationForm
            mode="update"
            notification={notification}
          />
        </section>
      </>,
      {
        currentMenuName: 'admin.web.notification',
        pageTitle: `编辑公告 - ${notification.title}`,
      },
    )
  } catch (error) {
    return redirectWithAlert(c, pagePath, {
      message: getActionErrorMessage(error),
      type: 'error',
    })
  }
})
