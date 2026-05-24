import type { Child } from 'hono/jsx'
import type { MenuItem } from '../../../../service/admin/system/menu/consts'
import type { UserHeaderProfile } from '../../../../service/admin/system/user/dto'
import { defaultMenus } from '../../../../service/admin/system/menu/consts'
import Aside from './components/aside'
import Header from './components/header'

interface Props {
  children: Child
  currentMenuName: string
  menus?: MenuItem[]
  siteTitle?: string
  user?: UserHeaderProfile | null
}

export default function Layout({
  children,
  currentMenuName,
  menus = defaultMenus,
  siteTitle = 'HonoAdmin',
  user = null,
}: Props) {
  const id = 'aside-drawer'

  return (
    <div
      class="h-screen overflow-x-hidden p-4 bg-base-200"
      data-controller="layout"
    >
      <div class="drawer lg:drawer-open h-full! min-w-0 overflow-x-hidden lg:gap-4">
        <input
          id={id}
          type="checkbox"
          class="drawer-toggle"
          data-action="change->layout#drawerChanged"
          data-layout-target="drawerToggle"
        />
        {/* aside */}
        <Aside
          currentMenuName={currentMenuName}
          id={id}
          menus={menus}
          siteTitle={siteTitle}
        />
        {/* content */}
        <main class="drawer-content flex h-full min-w-0 flex-col overflow-hidden">
          {/* header */}
          <Header
            currentMenuName={currentMenuName}
            menus={menus}
            user={user}
          />
          <div
            class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
            data-page-scroll
          >
            <section class="min-w-0 flex-1">
              <div class={getPageRootClass()} data-app-page-root="true">
                {children}
              </div>
            </section>
            <footer class="mt-auto px-4 pb-1 pt-3 text-center text-xs text-base-content/50">
              {`Copyright © 2026 ${siteTitle}. All rights reserved.`}
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

function getPageRootClass() {
  return 'min-w-0 overflow-x-clip p-4'
}
