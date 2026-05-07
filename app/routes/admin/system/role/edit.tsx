import { createRoute } from 'honox/factory'
import { adminMenus } from '../../../../service/admin/system/menu/consts'
import { listPermissions } from '../../../../service/admin/system/permission'
import { getRoleById } from '../../../../service/admin/system/role'
import { idParamSchema } from '../../../../service/common/response'
import Layout from '../../../_components/_layout/$index'
import PageAlert from '../../../_components/_page-alert'
import PageHeader from '../../../_components/_page-header'
import {
  getActionErrorMessage,
  getPageAlert,
  redirectWithAlert,
} from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleRoleUpdateAction } from './_actions'
import RoleForm from './_components/_role-form'

const pagePath = '/admin/system/role'

export const POST = createRoute(handleRoleUpdateAction)

export default createRoute(async (c) => {
  try {
    const id = idParamSchema.parse({ id: c.req.query('id') }).id
    const [role, layout, permissions] = await Promise.all([
      getRoleById(c, id),
      getAdminLayoutData(c),
      listPermissions(c),
    ])

    return c.render(
      <Layout
        canSwitchRole={layout.canSwitchRole}
        currentMenuName="admin.system.role"
        menus={layout.menus}
        siteTitle={layout.siteTitle}
        user={layout.user}
      >
        <title>{`编辑角色 - ${role.name} - ${layout.siteTitle}`}</title>
        <PageAlert alert={getPageAlert(c)} />
        <section class="rounded-box border border-base-300 bg-base-100 p-4">
          <PageHeader
            backHref={pagePath}
            description="更新角色基础信息、菜单权限和操作权限。"
            title="编辑角色"
          />
          <RoleForm
            menus={adminMenus}
            mode="update"
            permissions={permissions}
            role={role}
          />
        </section>
      </Layout>,
    )
  } catch (error) {
    return redirectWithAlert(c, pagePath, {
      message: getActionErrorMessage(error),
      type: 'error',
    })
  }
})
