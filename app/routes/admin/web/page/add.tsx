import { createRoute } from 'honox/factory'
import PageAlert from '../../../-/components/page-alert'
import PageHeader from '../../../-/components/page-header'
import {
  getPageAlert,
  getQueryReturnPath,
} from '../../../-/utils/form'
import { handleWebPageCreateAction } from './-actions'
import WebPageForm from './-components/page-form'

export const POST = createRoute(handleWebPageCreateAction)

export default createRoute(async (c) => {
  const returnTo = getQueryReturnPath(c, '/admin/web/page')

  return c.render(
    <>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <PageHeader
          backHref="/admin/web/page"
          description="填写页面基础信息和富文本内容。"
          title="新增页面"
        />
        <WebPageForm mode="create" returnTo={returnTo} />
      </section>
    </>,
    {
      currentMenuName: 'admin.web.page',
      pageTitle: '新增页面',
    },
  )
})
