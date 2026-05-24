import { createRoute } from 'honox/factory'
import PageAlert from '../../../-/components/page-alert'
import PageHeader from '../../../-/components/page-header'
import {
  getPageAlert,
  getQueryReturnPath,
} from '../../../-/utils/form'
import { adminMenus } from '../../../../service/admin/system/menu/consts'
import { listPermissions } from '../../../../service/admin/system/permission'
import { handleRoleCreateAction } from './-actions'
import RoleForm from './-components/role-form'

export const POST = createRoute(handleRoleCreateAction)

export default createRoute(async (c) => {
  const returnTo = getQueryReturnPath(c, '/admin/system/role')
  const permissions = await listPermissions(c)

  return c.render(
    <>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <PageHeader
          backHref="/admin/system/role"
          description="配置角色基础信息、菜单权限和操作权限。"
          title="新增角色"
        />
        <RoleForm
          menus={adminMenus}
          mode="create"
          permissions={permissions}
          returnTo={returnTo}
        />
      </section>
    </>,
    {
      currentMenuName: 'admin.system.role',
      pageTitle: '新增角色',
    },
  )
})
