import { createRoute } from 'honox/factory'
import PageAlert from '../../../-/components/page-alert'
import PageHeader from '../../../-/components/page-header'
import { idParamSchema } from '../../../-/schemas/response'
import {
  getActionErrorMessage,
  getPageAlert,
  getQueryReturnPath,
  redirectWithAlert,
} from '../../../-/utils/form'
import { adminMenus } from '../../../../service/admin/system/menu/consts'
import { listPermissions } from '../../../../service/admin/system/permission'
import { getRoleById } from '../../../../service/admin/system/role'
import { handleRoleUpdateAction } from './-actions'
import RoleForm from './-components/role-form'

const pagePath = '/admin/system/role'

export const POST = createRoute(handleRoleUpdateAction)

export default createRoute(async (c) => {
  try {
    const id = idParamSchema.parse({ id: c.req.query('id') }).id
    const returnTo = getQueryReturnPath(c, pagePath)
    const [role, permissions] = await Promise.all([
      getRoleById(c, id),
      listPermissions(c),
    ])

    return c.render(
      <>
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
            returnTo={returnTo}
            role={role}
          />
        </section>
      </>,
      {
        currentMenuName: 'admin.system.role',
        pageTitle: `编辑角色 - ${role.name}`,
      },
    )
  } catch (error) {
    return redirectWithAlert(c, pagePath, {
      message: getActionErrorMessage(error),
      type: 'error',
    })
  }
})
