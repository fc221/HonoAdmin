import { createRoute } from 'honox/factory'
import PageAlert from '../../../-/components/page-alert'
import PageHeader from '../../../-/components/page-header'
import {
  getActionErrorMessage,
  getPageAlert,
  getQueryReturnPath,
  redirectWithAlert,
} from '../../../-/utils/form'
import { getWebPageById } from '../../../../service/admin/web/page'
import { idParamSchema } from '../../../../service/common/response'
import { handleWebPageUpdateAction } from './-actions'
import WebPageForm from './-components/page-form'

const pagePath = '/admin/web/page'

export const POST = createRoute(handleWebPageUpdateAction)

export default createRoute(async (c) => {
  try {
    const id = idParamSchema.parse({ id: c.req.query('id') }).id
    const returnTo = getQueryReturnPath(c, pagePath)
    const page = await getWebPageById(c, id)

    return c.render(
      <>
        <PageAlert alert={getPageAlert(c)} />
        <section class="rounded-box border border-base-300 bg-base-100 p-4">
          <PageHeader
            backHref={pagePath}
            description="更新页面基础信息和富文本内容。"
            title="编辑页面"
          />
          <WebPageForm mode="update" page={page} returnTo={returnTo} />
        </section>
      </>,
      {
        currentMenuName: 'admin.web.page',
        pageTitle: `编辑页面 - ${page.title}`,
      },
    )
  } catch (error) {
    return redirectWithAlert(c, pagePath, {
      message: getActionErrorMessage(error),
      type: 'error',
    })
  }
})
