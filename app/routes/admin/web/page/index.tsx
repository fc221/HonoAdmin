import { createRoute } from 'honox/factory'
import { listWebPages, listWebPageSchema } from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleWebPageAction } from './_actions'
import WebPagePanel from './_components/_page-panel'

export const POST = createRoute(handleWebPageAction)

export default createRoute(async (c) => {
  const listInput = listWebPageSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const [pagination, layout] = await Promise.all([
    listWebPages(c, listInput),
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
      <title>{`页面管理 - ${layout.siteTitle}`}</title>
      <WebPagePanel
        alert={getPageAlert(c)}
        keyword={listInput.keyword}
        pages={pagination.items}
        pagination={pagination}
      />
    </Layout>,
  )
})
