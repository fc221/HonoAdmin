import { createRoute } from 'honox/factory'
import PageAlert from '../../../_components/$page-alert'
import PageHeader from '../../../_components/_page-header'
import { getPageAlert } from '../../../_utils/form'
import { handleWebPageCreateAction } from './_actions'
import WebPageForm from './_components/_page-form'

export const POST = createRoute(handleWebPageCreateAction)

export default createRoute(async (c) => {
  return c.render(
    <>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <PageHeader
          backHref="/admin/web/page"
          description="填写页面基础信息和富文本内容。"
          title="新增页面"
        />
        <WebPageForm mode="create" />
      </section>
    </>,
    {
      currentMenuName: 'admin.web.page',
      pageTitle: '新增页面',
    },
  )
})
