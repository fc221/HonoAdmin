import { createRoute } from 'honox/factory'
import { listFiles } from '../../../../service/admin/system/file'
import { listFileSchema } from '../../../../service/admin/system/file/dto'
import { getPageAlert } from '../../../_utils/form'
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
