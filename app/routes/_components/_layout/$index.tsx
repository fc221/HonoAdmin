import type { MenuItem, UserHeaderProfile } from '../../../service'
import { Child, useEffect, useState } from 'hono/jsx'
import { defaultMenus } from '../../../service/admin/system/menu'
import LayoutProvider, { useLayoutContext } from './$context'
import Aside from './_components/$aside'
import Header from './_components/$header'

interface Props {
  canSwitchRole?: boolean
  children: Child
  currentMenuName: string
  menus?: MenuItem[]
  user?: UserHeaderProfile | null
}

interface PjaxContentDetail {
  currentMenuName: string
  html: string
}

interface PjaxStatusDetail {
  pending: boolean
}

export default function Layout({
  canSwitchRole,
  children,
  currentMenuName,
  menus,
  user,
}: Props) {
  return (
    <LayoutProvider>
      <AsideLayout
        canSwitchRole={canSwitchRole}
        currentMenuName={currentMenuName}
        menus={menus}
        user={user}
      >
        {children}
      </AsideLayout>
    </LayoutProvider>
  )
}

// 侧边栏布局
function AsideLayout({
  canSwitchRole,
  children,
  currentMenuName: initialCurrentMenuName,
  menus = defaultMenus,
  user = null,
}: Props) {
  const { config, isDesktop, isReady, updateConfig } = useLayoutContext()
  const [pageHtml, setPageHtml] = useState<string | null>(null)
  const [currentMenuName, setCurrentMenuName] = useState(
    initialCurrentMenuName,
  )
  const [isAsideOpen, setIsAsideOpen] = useState(false)
  const [isPjaxPending, setIsPjaxPending] = useState(false)

  const id = 'aside-drawer'
  const isCollapsed = isDesktop ? config.sidebarCollapsed : false
  const isDrawerOpen = isReady ? isDesktop || isAsideOpen : false
  const canUseRoleSwitch = canSwitchRole ?? hasAdminMenuHref(menus)

  useEffect(() => {
    if (!isReady) {
      return
    }

    setIsAsideOpen(false)
  }, [isDesktop, isReady])

  useEffect(() => {
    const handlePjaxContent = (event: Event) => {
      const { currentMenuName, html } = (
        event as CustomEvent<PjaxContentDetail>
      ).detail

      setPageHtml(html)
      if (currentMenuName) {
        setCurrentMenuName(currentMenuName)
      }
    }

    const handlePjaxStatus = (event: Event) => {
      const { pending } = (event as CustomEvent<PjaxStatusDetail>).detail
      setIsPjaxPending(pending)
    }

    window.addEventListener('hono-admin:pjax-content', handlePjaxContent)
    window.addEventListener('hono-admin:pjax-status', handlePjaxStatus)
    return () => {
      window.removeEventListener('hono-admin:pjax-content', handlePjaxContent)
      window.removeEventListener('hono-admin:pjax-status', handlePjaxStatus)
    }
  }, [])

  const handleAsideToggle = () => {
    if (!isReady) {
      return
    }

    if (isDesktop) {
      updateConfig({ sidebarCollapsed: !config.sidebarCollapsed })
      return
    }

    setIsAsideOpen((open) => !open)
  }

  return (
    <div class="h-screen overflow-x-hidden p-4 bg-base-200">
      <LayoutLoading visible={!isReady} />
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
          currentMenuName={currentMenuName}
          id={id}
          isDesktop={isDesktop}
          isAsideOpen={isAsideOpen}
          isCollapsed={isCollapsed}
          onToggle={handleAsideToggle}
          theme={config.theme}
          menus={menus}
          onThemeChange={(theme) => updateConfig({ theme })}
        />
        {/* content */}
        <main class="drawer-content flex h-full min-w-0 flex-col overflow-hidden">
          {/* header */}
          <Header
            canSwitchRole={canUseRoleSwitch}
            currentMenuName={currentMenuName}
            isDesktop={isDesktop}
            isAsideOpen={isAsideOpen}
            isCollapsed={isCollapsed}
            onToggle={handleAsideToggle}
            onRefresh={handleRefresh}
            menus={menus}
            user={user}
          />
          <div
            class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
            data-page-scroll
          >
            <MainPjaxLoading visible={isPjaxPending} />
            <section class="min-w-0 flex-1">
              {pageHtml === null
                ? (
                    <div
                      id="pjax-root"
                      data-pjax-root
                      data-current-menu-name={currentMenuName}
                      class={getPjaxRootClass(isPjaxPending)}
                    >
                      {children}
                    </div>
                  )
                : (
                    <div
                      id="pjax-root"
                      data-pjax-root
                      data-current-menu-name={currentMenuName}
                      class={getPjaxRootClass(isPjaxPending)}
                      dangerouslySetInnerHTML={{ __html: pageHtml }}
                    />
                  )}
            </section>
            <footer class="mt-auto px-4 pb-1 pt-3 text-center text-xs text-base-content/50">
              Copyright © 2026 HonoAdmin. All rights reserved.
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

function getPjaxRootClass(isPjaxPending: boolean) {
  return `min-w-0 overflow-x-clip p-4 transition-opacity duration-150 ease-out ${isPjaxPending ? 'opacity-60' : 'opacity-100'}`
}

function handleRefresh() {
  const refreshEvent = new Event('hono-admin:pjax-refresh', {
    cancelable: true,
  })

  if (window.dispatchEvent(refreshEvent)) {
    location.reload()
  }
}

function MainPjaxLoading({ visible }: { visible: boolean }) {
  if (!visible) {
    return null
  }

  return (
    <div
      class="pointer-events-none absolute inset-0 z-98 flex items-start justify-center bg-base-200/35 pt-10 backdrop-blur-[1px]"
      role="status"
      aria-label="内容刷新中"
    >
      <span class="loading loading-spinner loading-md text-primary"></span>
    </div>
  )
}

function hasAdminMenuHref(items: MenuItem[]): boolean {
  return items.some((item) =>
    item.href?.startsWith('/admin') || hasAdminMenuHref(item.children ?? [])
  )
}

function LayoutLoading({ visible }: { visible: boolean }) {
  if (!visible) {
    return null
  }

  return (
    <div
      class="fixed inset-0 z-100 flex items-center justify-center bg-base-100/75 backdrop-blur-sm"
      role="status"
      aria-label="页面加载中"
    >
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>
  )
}
