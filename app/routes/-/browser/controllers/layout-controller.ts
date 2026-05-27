import type { LayoutConfig } from '../../components/layout/config'
import { Controller } from '@hotwired/stimulus'
import {
  defaultLayoutConfig,
  desktopBreakpoint,
  isLayoutMainWidth,
  isLayoutVariant,
  isThemeName,
  layoutConfigStorageKey,
} from '../../components/layout/config'

const headerIconBaseClass = 'transition-transform duration-150 ease-out text-sm'

export default class LayoutController extends Controller<HTMLElement> {
  static targets = [
    'asideToggleLabel',
    'drawerToggle',
    'headerToggle',
    'headerToggleIcon',
    'mobileOverlay',
    'panel',
  ]

  declare readonly asideToggleLabelTarget: HTMLElement
  declare readonly drawerToggleTarget: HTMLInputElement
  declare readonly headerToggleTarget: HTMLButtonElement
  declare readonly headerToggleIconTarget: HTMLElement
  declare readonly mobileOverlayTarget: HTMLElement
  declare readonly panelTarget: HTMLElement
  declare readonly hasDrawerToggleTarget: boolean
  declare readonly hasMobileOverlayTarget: boolean
  declare readonly hasPanelTarget: boolean
  declare readonly hasHeaderToggleTarget: boolean
  declare readonly hasHeaderToggleIconTarget: boolean
  declare readonly hasAsideToggleLabelTarget: boolean

  private resizeMediaQuery: MediaQueryList | null = null

  connect() {
    this.resizeMediaQuery = window.matchMedia(`(min-width: ${desktopBreakpoint}px)`)
    this.resizeMediaQuery.addEventListener('change', this.handleViewportChange)

    if (!this.hasDrawerToggleTarget) {
      return
    }

    this.applyStoredSidebarState()
    this.sync()
  }

  disconnect() {
    this.resizeMediaQuery?.removeEventListener('change', this.handleViewportChange)
  }

  toggle(event: Event) {
    event.preventDefault()

    if (!this.hasDrawerToggleTarget) {
      return
    }

    if (this.isDesktop()) {
      this.setSidebarCollapsed(!readStoredLayoutConfig().sidebarCollapsed)
      this.sync()
      return
    }

    this.drawerToggleTarget.checked = !this.drawerToggleTarget.checked
    this.sync()
  }

  closeDrawer() {
    if (!this.hasDrawerToggleTarget || this.isDesktop()) {
      return
    }

    this.drawerToggleTarget.checked = false
    this.sync()
  }

  drawerChanged() {
    if (!this.hasDrawerToggleTarget) {
      return
    }

    this.sync()
  }

  refresh() {
    window.location.reload()
  }

  private handleViewportChange = () => {
    if (!this.hasDrawerToggleTarget) {
      return
    }

    if (this.isDesktop()) {
      this.drawerToggleTarget.checked = false
    }

    this.sync()
  }

  private applyStoredSidebarState() {
    this.setRootSidebarCollapsed(readStoredLayoutConfig().sidebarCollapsed)
  }

  private setSidebarCollapsed(sidebarCollapsed: boolean) {
    const config = readStoredLayoutConfig()
    persistLayoutConfig({ ...config, sidebarCollapsed })
    this.setRootSidebarCollapsed(sidebarCollapsed)
  }

  private setRootSidebarCollapsed(sidebarCollapsed: boolean) {
    document.documentElement.dataset.sidebarCollapsed = sidebarCollapsed
      ? 'true'
      : 'false'
  }

  private sync() {
    const isDesktop = this.isDesktop()
    const isDrawerOpen = this.drawerToggleTarget.checked
    const isCollapsed = readStoredLayoutConfig().sidebarCollapsed

    if (isDesktop && isDrawerOpen) {
      this.drawerToggleTarget.checked = false
    }

    this.mobileOverlayTarget.classList.toggle('bg-transparent', isDesktop)
    this.mobileOverlayTarget.classList.toggle('bg-black/30', !isDesktop && isDrawerOpen)
    this.mobileOverlayTarget.classList.toggle('bg-black/0', !isDesktop && !isDrawerOpen)
    this.mobileOverlayTarget.classList.toggle('opacity-100', !isDesktop && isDrawerOpen)
    this.mobileOverlayTarget.classList.toggle('opacity-0', isDesktop || !isDrawerOpen)

    this.panelTarget.classList.toggle('shadow-2xl', !isDesktop && isDrawerOpen)
    this.panelTarget.classList.toggle('shadow-none', isDesktop || !isDrawerOpen)

    this.headerToggleTarget.setAttribute(
      'aria-label',
      !isDesktop
        ? isDrawerOpen ? '关闭侧边栏' : '打开侧边栏'
        : isCollapsed ? '展开侧边栏' : '折叠侧边栏',
    )

    this.headerToggleIconTarget.className = getHeaderIconClass({
      isCollapsed,
      isDesktop,
      isDrawerOpen,
    })
    this.syncAsideToggleIcons(isDesktop, isCollapsed)

    this.asideToggleLabelTarget.textContent = !isDesktop
      ? isDrawerOpen ? '关闭导航' : '打开导航'
      : '折叠导航'
  }

  private syncAsideToggleIcons(isDesktop: boolean, isCollapsed: boolean) {
    this.element
      .querySelectorAll<HTMLElement>('[data-layout-icon-mobile]')
      .forEach((icon) => icon.classList.toggle('hidden', isDesktop))
    this.element
      .querySelectorAll<HTMLElement>('[data-layout-icon-desktop-expanded]')
      .forEach((icon) => {
        icon.classList.toggle('inline-block', isDesktop && !isCollapsed)
        icon.classList.toggle('hidden', !isDesktop || isCollapsed)
      })
    this.element
      .querySelectorAll<HTMLElement>('[data-layout-icon-desktop-collapsed]')
      .forEach((icon) => {
        icon.classList.toggle('inline-block', isDesktop && isCollapsed)
        icon.classList.toggle('hidden', !isDesktop || !isCollapsed)
      })
  }

  private isDesktop() {
    return window.innerWidth >= desktopBreakpoint
  }
}

function getHeaderIconClass({
  isCollapsed,
  isDesktop,
  isDrawerOpen,
}: {
  isCollapsed: boolean
  isDesktop: boolean
  isDrawerOpen: boolean
}) {
  if (!isDesktop) {
    return isDrawerOpen
      ? `rotate-90 ${headerIconBaseClass} icon-[ri--close-line]`
      : `rotate-0 ${headerIconBaseClass} icon-[ri--menu-line]`
  }

  return isCollapsed
    ? `scale-95 ${headerIconBaseClass} icon-[ri--menu-fold-2-line]`
    : `scale-100 ${headerIconBaseClass} icon-[ri--menu-fold-line]`
}

function readStoredLayoutConfig(): LayoutConfig {
  try {
    const value = localStorage.getItem(layoutConfigStorageKey)
    const parsed = value ? JSON.parse(value) as Partial<LayoutConfig> : {}

    return {
      mainWidth: isLayoutMainWidth(parsed.mainWidth)
        ? parsed.mainWidth
        : defaultLayoutConfig.mainWidth,
      sidebarCollapsed: typeof parsed.sidebarCollapsed === 'boolean'
        ? parsed.sidebarCollapsed
        : defaultLayoutConfig.sidebarCollapsed,
      theme: isThemeName(parsed.theme) ? parsed.theme : defaultLayoutConfig.theme,
      topMenuCentered: typeof parsed.topMenuCentered === 'boolean'
        ? parsed.topMenuCentered
        : defaultLayoutConfig.topMenuCentered,
      variant: isLayoutVariant(parsed.variant)
        ? parsed.variant
        : defaultLayoutConfig.variant,
    }
  } catch {
    return { ...defaultLayoutConfig }
  }
}

function persistLayoutConfig(config: LayoutConfig) {
  try {
    localStorage.setItem(layoutConfigStorageKey, JSON.stringify(config))
  } catch {}
}
