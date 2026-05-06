import { createRoute } from 'honox/factory'
import { listFiles, listFileSchema } from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleFileAction } from './_actions'
import FilePanel from './_components/_file-panel'

export const POST = createRoute(handleFileAction)

export default createRoute(async (c) => {
  const listInput = listFileSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
    uploadType: c.req.query('uploadType'),
  })
  const [pagination, layout] = await Promise.all([
    listFiles(c, listInput),
    getAdminLayoutData(c),
  ])

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.system.file"
      menus={layout.menus}
      user={layout.user}
    >
      <title>文件管理 - HonoAdmin</title>
      <FilePanel
        alert={getPageAlert(c)}
        files={pagination.items}
        keyword={listInput.keyword}
        pagination={pagination}
        timezone={c.config.timezone}
        uploadType={listInput.uploadType}
      />
    </Layout>,
  )
})
