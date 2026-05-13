import { createRoute } from 'honox/factory'
import { listWebFeedbacks } from '../../../../service/admin/web/feedback'
import { listWebFeedbackSchema } from '../../../../service/admin/web/feedback/dto'
import { getPageAlert } from '../../../_utils/form'
import { handleWebFeedbackAction } from './_actions'
import WebFeedbackPanel from './_components/_feedback-panel'

export const POST = createRoute(handleWebFeedbackAction)

export default createRoute(async (c) => {
  const listInput = listWebFeedbackSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const pagination = await listWebFeedbacks(c, listInput)

  return c.render(
    <WebFeedbackPanel
      alert={getPageAlert(c)}
      feedbacks={pagination.items}
      keyword={listInput.keyword}
      pagination={pagination}
    />,
    {
      currentMenuName: 'admin.web.feedback',
      pageTitle: '用户反馈',
    },
  )
})
