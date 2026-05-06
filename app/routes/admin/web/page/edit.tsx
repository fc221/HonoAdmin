import { createRoute } from 'honox/factory'
import { getWebPageById, idParamSchema } from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import PageAlert from '../../../_components/_page-alert'
import PageHeader from '../../../_components/_page-header'
import {
  getActionErrorMessage,
  getPageAlert,
  redirectWithAlert,
} from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleWebPageUpdateAction } from './_actions'
import WebPageForm from './_components/_page-form'

const pagePath = '/admin/web/page'

export const POST = createRoute(handleWebPageUpdateAction)

export default createRoute(async (c) => {
  try {
    const id = idParamSchema.parse({ id: c.req.query('id') }).id
    const [page, layout] = await Promise.all([
      getWebPageById(c, id),
      getAdminLayoutData(c),
    ])

    return c.render(
      <Layout
        canSwitchRole={layout.canSwitchRole}
        currentMenuName="admin.web.page"
        menus={layout.menus}
        siteTitle={layout.siteTitle}
        user={layout.user}
      >
        <title>{`编辑页面 - ${page.title} - ${layout.siteTitle}`}</title>
        <PageAlert alert={getPageAlert(c)} />
        <section class="rounded-box border border-base-300 bg-base-100 p-4">
          <PageHeader
            backHref={pagePath}
            description="更新页面基础信息和富文本内容。"
            title="编辑页面"
          />
          <WebPageForm mode="update" page={page} />
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
