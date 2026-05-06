import { createRoute } from 'honox/factory'
import Layout from '../../../_components/_layout/$index'
import PageAlert from '../../../_components/_page-alert'
import PageHeader from '../../../_components/_page-header'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleWebPageCreateAction } from './_actions'
import WebPageForm from './_components/_page-form'

export const POST = createRoute(handleWebPageCreateAction)

export default createRoute(async (c) => {
  const layout = await getAdminLayoutData(c)

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.web.page"
      menus={layout.menus}
      user={layout.user}
    >
      <title>新增页面 - HonoAdmin</title>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <PageHeader
          backHref="/admin/web/page"
          description="填写页面基础信息和富文本内容。"
          title="新增页面"
        />
        <WebPageForm mode="create" />
      </section>
    </Layout>,
  )
})
