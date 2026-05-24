export const layoutConfigStorageKey = 'hono-admin:config'

export const systemThemeQuery = '(prefers-color-scheme: dark)'

export const desktopBreakpoint = 1024

export const themeNames = ['system', 'light', 'dark', 'black'] as const

export type ThemeName = (typeof themeNames)[number]

export type DaisyThemeName = Exclude<ThemeName, 'system'>

export interface LayoutConfig {
  sidebarCollapsed: boolean
  theme: ThemeName
}

export const defaultLayoutConfig: LayoutConfig = {
  sidebarCollapsed: false,
  theme: 'light',
}

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && themeNames.includes(value as ThemeName)
}
