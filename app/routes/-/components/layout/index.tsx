import type { Child } from 'hono/jsx'
import type { MenuItem } from '../../../../service/admin/system/menu/consts'
import type { UserHeaderProfile } from '../../../../service/admin/system/user/dto'
import type {
  LayoutMainWidth,
  LayoutSidebarLogoStyle,
  LayoutSidebarMenuStyle,
  LayoutVariant,
} from './config'
import { defaultMenus } from '../../../../service/admin/system/menu/consts'
import Aside from './components/aside'
import Header from './components/header'
import TopNav from './components/top-nav'
import {
  isFlushVariant,
  isHybridVariant,
  isTopNavVariant,
  layoutPreset,
} from './config'

interface Props {
  children: Child
  currentMenuName: string
  menus?: MenuItem[]
  siteTitle?: string
  user?: UserHeaderProfile | null
  mainWidth?: LayoutMainWidth
  sidebarLogoStyle?: LayoutSidebarLogoStyle
  sidebarMenuStyle?: LayoutSidebarMenuStyle
  topMenuCentered?: boolean
  variant?: LayoutVariant
}

export default function Layout({
  children,
  currentMenuName,
  menus = defaultMenus,
  siteTitle = 'HonoAdmin',
  user = null,
  mainWidth = layoutPreset.mainWidth,
  sidebarLogoStyle = layoutPreset.sidebarLogoStyle,
  sidebarMenuStyle = layoutPreset.sidebarMenuStyle,
  topMenuCentered = layoutPreset.topMenuCentered,
  variant = layoutPreset.variant,
}: Props) {
  const flush = isFlushVariant(variant)
  const hybrid = isHybridVariant(variant)
  const topNav = isTopNavVariant(variant)
  const effectiveMainWidth = hybrid ? 'wide' : mainWidth
  const effectiveTopMenuCentered = hybrid ? false : topMenuCentered
  const rootClass = `h-screen overflow-x-hidden bg-base-200 ${flush ? '' : 'p-4'}`
  const footer = (
    <footer class={getFooterClass({ flush })}>
      {`Copyright © 2026 ${siteTitle}. All rights reserved.`}
    </footer>
  )

  if (topNav) {
    const id = 'aside-drawer'

    return (
      <div
        class={rootClass}
        data-controller="layout"
        data-layout-main-width={effectiveMainWidth}
        data-layout-sidebar-logo-style={sidebarLogoStyle}
        data-layout-sidebar-menu-style={sidebarMenuStyle}
        data-layout-top-menu-centered={effectiveTopMenuCentered ? 'true' : 'false'}
        data-layout-variant={variant}
      >
        <div class="drawer h-full! min-w-0 overflow-x-hidden">
          <input
            id={id}
            type="checkbox"
            class="drawer-toggle"
            data-action="change->layout#drawerChanged"
            data-layout-target="drawerToggle"
          />
          <Aside
            currentMenuName={currentMenuName}
            flush={flush}
            id={id}
            menus={menus}
            siteTitle={siteTitle}
          />
          <main class="drawer-content flex h-full min-w-0 flex-col overflow-hidden">
            <div class="lg:hidden">
              <Header
                currentMenuName={currentMenuName}
                flush={flush}
                menus={menus}
                user={user}
              />
            </div>
            <div class="hidden lg:block">
              <TopNav
                currentMenuName={currentMenuName}
                flush={flush}
                menus={menus}
                siteTitle={siteTitle}
                user={user}
              />
            </div>
            <div
              class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
              data-page-scroll
            >
              <section class="min-w-0 flex-1">
                <div class={getPageRootClass()} data-app-page-root="true">
                  {children}
                </div>
              </section>
              {footer}
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (hybrid) {
    const id = 'aside-drawer'
    const drawerClass = `drawer lg:drawer-open min-h-0 flex-1 overflow-x-hidden ${
      flush ? '' : 'lg:gap-4'
    }`

    return (
      <div
        class={rootClass}
        data-controller="layout"
        data-layout-main-width={effectiveMainWidth}
        data-layout-sidebar-logo-style={sidebarLogoStyle}
        data-layout-sidebar-menu-style={sidebarMenuStyle}
        data-layout-top-menu-centered="false"
        data-layout-variant={variant}
      >
        <div class={`flex h-full min-w-0 flex-col overflow-hidden ${flush ? '' : 'gap-4'}`}>
          <div class="lg:hidden">
            <Header
              currentMenuName={currentMenuName}
              flush={flush}
              menus={menus}
              user={user}
            />
          </div>
          <div class="hidden lg:block">
            <TopNav
              currentMenuName={currentMenuName}
              flush={flush}
              menus={menus}
              rootOnly
              siteTitle={siteTitle}
              user={user}
            />
          </div>
          <div class={drawerClass}>
            <input
              id={id}
              type="checkbox"
              class="drawer-toggle"
              data-action="change->layout#drawerChanged"
              data-layout-target="drawerToggle"
            />
            <Aside
              currentMenuName={currentMenuName}
              flush={flush}
              id={id}
              menus={menus}
              mode="active-children"
              siteTitle={siteTitle}
            />
            <main class="drawer-content flex h-full min-w-0 flex-col overflow-hidden">
              <div
                class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
                data-page-scroll
              >
                <section class="min-w-0 flex-1">
                  <div class={getPageRootClass({ padded: flush })} data-app-page-root="true">
                    {children}
                  </div>
                </section>
                {footer}
              </div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  const id = 'aside-drawer'
  const drawerClass = `drawer lg:drawer-open h-full! min-w-0 overflow-x-hidden ${flush ? '' : 'lg:gap-4'}`

  return (
    <div
      class={rootClass}
      data-controller="layout"
      data-layout-main-width={effectiveMainWidth}
      data-layout-sidebar-logo-style={sidebarLogoStyle}
      data-layout-sidebar-menu-style={sidebarMenuStyle}
      data-layout-top-menu-centered={effectiveTopMenuCentered ? 'true' : 'false'}
      data-layout-variant={variant}
    >
      <div class={drawerClass}>
        <input
          id={id}
          type="checkbox"
          class="drawer-toggle"
          data-action="change->layout#drawerChanged"
          data-layout-target="drawerToggle"
        />
        <Aside
          currentMenuName={currentMenuName}
          flush={flush}
          id={id}
          menus={menus}
          siteTitle={siteTitle}
        />
        <main class="drawer-content flex h-full min-w-0 flex-col overflow-hidden">
          <Header
            currentMenuName={currentMenuName}
            flush={flush}
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
            {footer}
          </div>
        </main>
      </div>
    </div>
  )
}

function getPageRootClass({ padded = true }: { padded?: boolean } = {}) {
  return `min-w-0 overflow-x-clip${padded ? ' p-4' : ''}`
}

function getFooterClass({ flush }: { flush: boolean }) {
  return `mt-auto px-4 ${flush ? 'pb-4' : 'pb-1'} pt-3 text-center text-xs text-base-content/50`
}
