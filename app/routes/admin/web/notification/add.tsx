import { createRoute } from 'honox/factory'
import Layout from '../../../_components/_layout/$index'
import PageAlert from '../../../_components/_page-alert'
import PageHeader from '../../../_components/_page-header'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleWebNotificationCreateAction } from './_actions'
import WebNotificationForm from './_components/_notification-form'

export const POST = createRoute(handleWebNotificationCreateAction)

export default createRoute(async (c) => {
  const layout = await getAdminLayoutData(c)

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.web.notification"
      menus={layout.menus}
      siteTitle={layout.siteTitle}
      user={layout.user}
    >
      <title>{`新增公告 - ${layout.siteTitle}`}</title>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <PageHeader
          backHref="/admin/web/notification"
          description="填写公告基础信息和富文本内容。"
          title="新增公告"
        />
        <WebNotificationForm mode="create" />
      </section>
    </Layout>,
  )
})
