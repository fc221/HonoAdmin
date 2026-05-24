import type { DaisyThemeName, LayoutConfig, ThemeName } from '../../components/layout/config'
import { Controller } from '@hotwired/stimulus'
import {
  defaultLayoutConfig,
  isThemeName,
  layoutConfigStorageKey,
  systemThemeQuery,
} from '../../components/layout/config'

export default class ThemeController extends Controller<HTMLElement> {
  static targets = ['check', 'option']

  declare readonly checkTargets: HTMLElement[]
  declare readonly optionTargets: HTMLElement[]

  private mediaQuery: MediaQueryList | null = null

  connect() {
    this.mediaQuery = window.matchMedia(systemThemeQuery)
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange)
    this.sync()
  }

  disconnect() {
    this.mediaQuery?.removeEventListener('change', this.handleSystemThemeChange)
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
    hidePopover(this.element)
  }

  private sync() {
    const theme = readStoredLayoutConfig().theme
    this.applyTheme(theme)
    this.syncOptions(theme)
  }

  private applyTheme(theme: ThemeName) {
    document.documentElement.setAttribute('data-theme', resolveTheme(theme))
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
    if (readStoredLayoutConfig().theme === 'system') {
      this.applyTheme('system')
    }
  }
}

function readStoredLayoutConfig(): LayoutConfig {
  try {
    const value = localStorage.getItem(layoutConfigStorageKey)
    const parsed = value ? JSON.parse(value) as Partial<LayoutConfig> : {}

    return {
      sidebarCollapsed: typeof parsed.sidebarCollapsed === 'boolean'
        ? parsed.sidebarCollapsed
        : defaultLayoutConfig.sidebarCollapsed,
      theme: isThemeName(parsed.theme)
        ? parsed.theme
        : defaultLayoutConfig.theme,
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
  if (theme !== 'system') {
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
