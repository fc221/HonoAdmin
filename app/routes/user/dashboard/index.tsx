import { createRoute } from 'honox/factory'
import PageAlert from '../../-/components/page-alert'
import { getPageAlert } from '../../-/utils/form'

export default createRoute(async (c) => {
  return c.render(
    <>
      <PageAlert alert={getPageAlert(c)} />
      <section class="rounded-box border border-base-300 bg-base-100 p-4">
        <div>
          <h1 class="text-2xl font-bold">仪表盘</h1>
          <p class="mt-1 text-sm text-base-content/60">
            查看后台运行状态和关键管理入口。
          </p>
        </div>
      </section>
    </>,
    {
      currentMenuName: 'user.dashboard',
      pageTitle: '仪表盘',
    },
  )
})
