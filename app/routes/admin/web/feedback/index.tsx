import { createRoute } from 'honox/factory'
import { listWebFeedbacks } from '../../../../service/admin/web/feedback'
import { listWebFeedbackSchema } from '../../../../service/admin/web/feedback/dto'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleWebFeedbackAction } from './_actions'
import WebFeedbackPanel from './_components/_feedback-panel'

export const POST = createRoute(handleWebFeedbackAction)

export default createRoute(async (c) => {
  const listInput = listWebFeedbackSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const [pagination, layout] = await Promise.all([
    listWebFeedbacks(c, listInput),
    getAdminLayoutData(c),
  ])

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.web.feedback"
      menus={layout.menus}
      siteTitle={layout.siteTitle}
      user={layout.user}
    >
      <title>{`用户反馈 - ${layout.siteTitle}`}</title>
      <WebFeedbackPanel
        alert={getPageAlert(c)}
        feedbacks={pagination.items}
        keyword={listInput.keyword}
        pagination={pagination}
      />
    </Layout>,
  )
})
