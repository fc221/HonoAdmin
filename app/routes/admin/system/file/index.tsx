import { createRoute } from 'honox/factory'
import { getPageAlert } from '../../../-/utils/form'
import { listFiles } from '../../../../service/admin/system/file'
import { listFileSchema } from '../../../../service/admin/system/file/dto'
import { handleFileAction } from './-actions'
import FilePanel from './-components/file-panel'

export const POST = createRoute(handleFileAction)

export default createRoute(async (c) => {
  const listInput = listFileSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
    uploadType: c.req.query('uploadType'),
  })
  const pagination = await listFiles(c, listInput)

  return c.render(
    <FilePanel
      alert={getPageAlert(c)}
      files={pagination.items}
      keyword={listInput.keyword}
      pagination={pagination}
      timezone={c.config.timezone}
      uploadType={listInput.uploadType}
    />,
    {
      currentMenuName: 'admin.system.file',
      pageTitle: '文件管理',
    },
  )
})
