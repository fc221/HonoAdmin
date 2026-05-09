import { createRoute } from 'honox/factory'
import { listPaginatedRoles } from '../../../../service/admin/system/role'
import { listRoleSchema } from '../../../../service/admin/system/role/dto'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleRoleAction } from './_actions'
import RolePanel from './_components/_role-panel'

export const POST = createRoute(handleRoleAction)

export default createRoute(async (c) => {
  const listInput = listRoleSchema.parse({
    keyword: c.req.query('keyword'),
    page: c.req.query('page'),
    pageSize: c.req.query('pageSize'),
  })
  const [pagination, layout] = await Promise.all([
    listPaginatedRoles(c, listInput),
    getAdminLayoutData(c),
  ])

  return c.render(
    <Layout
      currentMenuName="admin.system.role"
      menus={layout.menus}
      siteTitle={layout.siteTitle}
      user={layout.user}
    >
      <title>{`角色管理 - ${layout.siteTitle}`}</title>
      <RolePanel
        alert={getPageAlert(c)}
        keyword={listInput.keyword}
        pagination={pagination}
        roles={pagination.items}
        timezone={c.config.timezone}
      />
    </Layout>,
  )
})
