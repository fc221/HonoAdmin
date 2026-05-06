import { createRoute } from 'honox/factory'
import { getWebNotificationById, idParamSchema } from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import PageAlert from '../../../_components/_page-alert'
import PageHeader from '../../../_components/_page-header'
import {
  getActionErrorMessage,
  getPageAlert,
  redirectWithAlert,
} from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleWebNotificationUpdateAction } from './_actions'
import WebNotificationForm from './_components/_notification-form'

const pagePath = '/admin/web/notification'

export const POST = createRoute(handleWebNotificationUpdateAction)

export default createRoute(async (c) => {
  try {
    const id = idParamSchema.parse({ id: c.req.query('id') }).id
    const [notification, layout] = await Promise.all([
      getWebNotificationById(c, id),
      getAdminLayoutData(c),
    ])

    return c.render(
      <Layout
        canSwitchRole={layout.canSwitchRole}
        currentMenuName="admin.web.notification"
        menus={layout.menus}
        user={layout.user}
      >
        <title>{`编辑公告 - ${notification.title} - HonoAdmin`}</title>
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
      </Layout>,
    )
  } catch (error) {
    return redirectWithAlert(c, pagePath, {
      message: getActionErrorMessage(error),
      type: 'error',
    })
  }
})
