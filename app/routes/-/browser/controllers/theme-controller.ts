import type {
  DaisyThemeName,
  LayoutConfig,
  ThemeName,
} from '../../components/layout/config'
import { Controller } from '@hotwired/stimulus'
import {
  defaultLayoutConfig,
  isLayoutMainWidth,
  isLayoutSidebarLogoStyle,
  isLayoutSidebarMenuStyle,
  isLayoutVariant,
  isThemeName,
  layoutConfigStorageKey,
  systemThemeName,
  systemThemeQuery,
} from '../../components/layout/config'

const themeChangedEventName = 'hono-admin:theme-changed'

export default class ThemeController extends Controller<HTMLElement> {
  static targets = ['check', 'option']

  declare readonly checkTargets: HTMLElement[]
  declare readonly optionTargets: HTMLElement[]

  private mediaQuery: MediaQueryList | null = null
  private themeSwitchFrame = 0

  connect() {
    this.mediaQuery = window.matchMedia(systemThemeQuery)
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange)
    window.addEventListener(themeChangedEventName, this.handleThemeChanged)
    this.sync()
  }

  disconnect() {
    this.mediaQuery?.removeEventListener('change', this.handleSystemThemeChange)
    window.removeEventListener(themeChangedEventName, this.handleThemeChanged)
    cancelAnimationFrame(this.themeSwitchFrame)
  }

  select(event: Event) {
    const target = event.currentTarget as HTMLElement
    const theme = target.dataset.themeValue
    if (!isThemeName(theme)) {
      return
    }

    const config = readStoredLayoutConfig()
    persistLayoutConfig({ ...config, theme })
    this.applyTheme(theme)
    this.syncOptions(theme)
    window.dispatchEvent(new CustomEvent(themeChangedEventName, { detail: { theme } }))
    hidePopover(this.element)
  }

  private sync() {
    const config = readStoredLayoutConfig()
    this.applyTheme(config.theme)
    this.syncOptions(config.theme)
  }

  private applyTheme(theme: ThemeName) {
    const root = document.documentElement
    root.dataset.themeSwitching = 'true'
    root.setAttribute('data-theme', resolveTheme(theme))

    cancelAnimationFrame(this.themeSwitchFrame)
    this.themeSwitchFrame = requestAnimationFrame(() => {
      this.themeSwitchFrame = requestAnimationFrame(() => {
        delete root.dataset.themeSwitching
      })
    })
  }

  private syncOptions(theme: ThemeName) {
    for (const option of this.optionTargets) {
      const selected = option.dataset.themeValue === theme
      option.setAttribute('aria-pressed', selected ? 'true' : 'false')
      option.classList.toggle('menu-active', selected)
    }

    for (const check of this.checkTargets) {
      check.classList.toggle('hidden', check.dataset.themeValue !== theme)
    }
  }

  private handleSystemThemeChange = () => {
    if (readStoredLayoutConfig().theme === systemThemeName) {
      this.applyTheme(systemThemeName)
    }
  }

  private handleThemeChanged = (event: Event) => {
    const theme = (event as CustomEvent<{ theme?: unknown }>).detail?.theme
    if (!isThemeName(theme)) {
      return
    }

    this.applyTheme(theme)
    this.syncOptions(theme)
  }
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
      sidebarLogoStyle: isLayoutSidebarLogoStyle(parsed.sidebarLogoStyle)
        ? parsed.sidebarLogoStyle
        : defaultLayoutConfig.sidebarLogoStyle,
      sidebarMenuStyle: isLayoutSidebarMenuStyle(parsed.sidebarMenuStyle)
        ? parsed.sidebarMenuStyle
        : defaultLayoutConfig.sidebarMenuStyle,
      theme: isThemeName(parsed.theme)
        ? parsed.theme
        : defaultLayoutConfig.theme,
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

function resolveTheme(theme: ThemeName): DaisyThemeName {
  if (theme !== systemThemeName) {
    return theme
  }

  return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light'
}

function hidePopover(root: HTMLElement) {
  const popover = root.querySelector<HTMLElement & { hidePopover?: () => void }>(
    '[popover]',
  )

  popover?.hidePopover?.()
}
