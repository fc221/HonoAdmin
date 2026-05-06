import { createRoute } from 'honox/factory'
import Layout from '../../_components/_layout/$index'
import { getAdminLayoutData } from '../_utils/layout'

export default createRoute(async (c) => {
  const layout = await getAdminLayoutData(c)

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.dashboard"
      menus={layout.menus}
      siteTitle={layout.siteTitle}
      user={layout.user}
    >
      <title>{`仪表盘 - ${layout.siteTitle}`}</title>
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div>
          <h1 class="text-2xl font-bold">仪表盘</h1>
          <p class="mt-1 text-sm text-base-content/60">
            查看后台运行状态和关键管理入口。
          </p>
        </div>
      </section>
    </Layout>,
  )
})
