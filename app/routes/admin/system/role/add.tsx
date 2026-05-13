import { createRoute } from 'honox/factory'
import { adminMenus } from '../../../../service/admin/system/menu/consts'
import { listPermissions } from '../../../../service/admin/system/permission'
import PageAlert from '../../../_components/$page-alert'
import PageHeader from '../../../_components/_page-header'
import { getPageAlert } from '../../../_utils/form'
import { handleRoleCreateAction } from './_actions'
import RoleForm from './_components/_role-form'

export const POST = createRoute(handleRoleCreateAction)

export default createRoute(async (c) => {
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
        />
      </section>
    </>,
    {
      currentMenuName: 'admin.system.role',
      pageTitle: '新增角色',
    },
  )
})
