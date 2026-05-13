import type { MenuItem } from '../../../service/admin/system/menu/consts'
import type { UserHeaderProfile } from '../../../service/admin/system/user/dto'
import { Child, useEffect, useState } from 'hono/jsx'
import LayoutProvider, { useLayoutStore } from './$context'
import Aside from './_components/$aside'
import Header from './_components/$header'

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
  menus,
  siteTitle,
  user,
}: Props) {
  return (
    <LayoutProvider
      currentMenuName={currentMenuName}
      menus={menus}
      siteTitle={siteTitle}
      user={user}
    >
      <AsideLayout>
        {children}
      </AsideLayout>
    </LayoutProvider>
  )
}

// 侧边栏布局
function AsideLayout({
  children,
}: {
  children: Child
}) {
  const { config, isDesktop, siteTitle, updateConfig } = useLayoutStore()
  const [isAsideOpen, setIsAsideOpen] = useState(false)

  const id = 'aside-drawer'
  const isCollapsed = isDesktop ? config.sidebarCollapsed : false
  const isDrawerOpen = isAsideOpen

  useEffect(() => {
    if (isDesktop) {
      setIsAsideOpen(false)
    }
  }, [isDesktop])

  const handleAsideToggle = () => {
    if (isDesktop) {
      updateConfig({ sidebarCollapsed: !config.sidebarCollapsed })
      return
    }

    setIsAsideOpen((open) => !open)
  }

  const handleMenuNavigate = () => {
    if (!isDesktop) {
      setIsAsideOpen(false)
    }
  }

  return (
    <div class="h-screen overflow-x-hidden p-4 bg-base-200">
      <div class="drawer lg:drawer-open h-full! min-w-0 overflow-x-hidden lg:gap-4">
        <input
          id={id}
          type="checkbox"
          class="drawer-toggle"
          checked={isDrawerOpen}
          onChange={() => {
            if (!isDesktop) {
              setIsAsideOpen((open) => !open)
            }
          }}
        />
        {/* aside */}
        <Aside
          id={id}
          isDesktop={isDesktop}
          isAsideOpen={isAsideOpen}
          isCollapsed={isCollapsed}
          onToggle={handleAsideToggle}
          onMenuNavigate={handleMenuNavigate}
        />
        {/* content */}
        <main class="drawer-content flex h-full min-w-0 flex-col overflow-hidden">
          {/* header */}
          <Header
            isDesktop={isDesktop}
            isAsideOpen={isAsideOpen}
            isCollapsed={isCollapsed}
            onToggle={handleAsideToggle}
            onRefresh={handleRefresh}
          />
          <div
            class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
            data-page-scroll
          >
            <section class="min-w-0 flex-1">
              <div class={getPageRootClass()}>{children}</div>
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

function handleRefresh() {
  location.reload()
}
