import { createRoute } from 'honox/factory'
import { listOperateLogs, listOperateLogSchema } from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleOperateLogAction } from './_actions'
import OperateLogPanel from './_components/_operate-log-panel'

export const POST = createRoute(handleOperateLogAction)

export default createRoute(async (c) => {
  const listInput = listOperateLogSchema.parse({
    keyword: c.req.query('keyword'),
    logType: c.req.query('logType'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const timezone = c.config.timezone
  const [pagination, layout] = await Promise.all([
    listOperateLogs(c, listInput),
    getAdminLayoutData(c),
  ])

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.system.operate-log"
      menus={layout.menus}
      siteTitle={layout.siteTitle}
      user={layout.user}
    >
      <title>{`操作日志 - ${layout.siteTitle}`}</title>
      <OperateLogPanel
        alert={getPageAlert(c)}
        keyword={listInput.keyword}
        logType={listInput.logType}
        logs={pagination.items}
        pagination={pagination}
        timezone={timezone}
      />
    </Layout>,
  )
})
