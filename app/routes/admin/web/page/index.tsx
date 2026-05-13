import { createRoute } from 'honox/factory'
import { listWebPages } from '../../../../service/admin/web/page'
import { listWebPageSchema } from '../../../../service/admin/web/page/dto'
import { getPageAlert } from '../../../_utils/form'
import { handleWebPageAction } from './_actions'
import WebPagePanel from './_components/_page-panel'

export const POST = createRoute(handleWebPageAction)

export default createRoute(async (c) => {
  const listInput = listWebPageSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const pagination = await listWebPages(c, listInput)

  return c.render(
    <WebPagePanel
      alert={getPageAlert(c)}
      keyword={listInput.keyword}
      pages={pagination.items}
      pagination={pagination}
    />,
    {
      currentMenuName: 'admin.web.page',
      pageTitle: '页面管理',
    },
  )
})
