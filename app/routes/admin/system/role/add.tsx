import { createRoute } from 'honox/factory'
import { adminMenus, listPermissions } from '../../../../service'
import Layout from '../../../_components/_layout/$index'
import PageAlert from '../../../_components/_page-alert'
import PageHeader from '../../../_components/_page-header'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleRoleCreateAction } from './_actions'
import RoleForm from './_components/_role-form'

export const POST = createRoute(handleRoleCreateAction)

export default createRoute(async (c) => {
  const [layout, permissions] = await Promise.all([
    getAdminLayoutData(c),
    listPermissions(c),
  ])

  return c.render(
    <Layout
      currentMenuName="admin.system.role"
      menus={layout.menus}
      user={layout.user}
    >
      <title>新增角色 - HonoAdmin</title>
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
    </Layout>,
  )
})
