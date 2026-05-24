import { createRoute } from 'honox/factory'
import { getPageAlert } from '../../../-/utils/form'
import { listOperateLogs } from '../../../../service/admin/system/operate-log'
import { listOperateLogSchema } from '../../../../service/admin/system/operate-log/dto'
import { handleOperateLogAction } from './-actions'
import OperateLogPanel from './-components/operate-log-panel'

export const POST = createRoute(handleOperateLogAction)

export default createRoute(async (c) => {
  const listInput = listOperateLogSchema.parse({
    keyword: c.req.query('keyword'),
    logType: c.req.query('logType'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const timezone = c.config.timezone
  const pagination = await listOperateLogs(c, listInput)

  return c.render(
    <OperateLogPanel
      alert={getPageAlert(c)}
      keyword={listInput.keyword}
      logType={listInput.logType}
      logs={pagination.items}
      pagination={pagination}
      timezone={timezone}
    />,
    {
      currentMenuName: 'admin.system.operate-log',
      pageTitle: '操作日志',
    },
  )
})
