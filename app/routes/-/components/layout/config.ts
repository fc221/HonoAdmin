export const layoutConfigStorageKey = 'hono-admin:config'

export const layoutVariantCookieName = 'hono-admin.layout-variant'

export const systemThemeQuery = '(prefers-color-scheme: dark)'

export const desktopBreakpoint = 1024

export const systemThemeName = 'system'

export const builtInThemeNames = ['light', 'dark', 'black'] as const

export const themeNames = [systemThemeName, ...builtInThemeNames] as const

export type BuiltInThemeName = (typeof builtInThemeNames)[number]

export type DaisyThemeName = string

export type ThemeName = typeof systemThemeName | DaisyThemeName

export const layoutVariants = [
  'sidebar',
  'sidebar-flush',
  'top-nav',
  'top-nav-flush',
] as const

export type LayoutVariant = (typeof layoutVariants)[number]

export const layoutMainWidths = ['wide', 'narrow'] as const

export type LayoutMainWidth = (typeof layoutMainWidths)[number]

export interface LayoutPreset {
  defaultTheme: ThemeName
  mainWidth: LayoutMainWidth
  sidebarCollapsed: boolean
  topMenuCentered: boolean
  variant: LayoutVariant
}

export interface LayoutConfig {
  mainWidth: LayoutMainWidth
  sidebarCollapsed: boolean
  theme: ThemeName
  topMenuCentered: boolean
  variant: LayoutVariant
}

export const layoutPreset: LayoutPreset = {
  defaultTheme: 'light',
  mainWidth: 'narrow',
  sidebarCollapsed: false,
  topMenuCentered: true,
  variant: 'sidebar',
}

export const defaultLayoutConfig: LayoutConfig = {
  mainWidth: layoutPreset.mainWidth,
  sidebarCollapsed: layoutPreset.sidebarCollapsed,
  theme: layoutPreset.defaultTheme,
  topMenuCentered: layoutPreset.topMenuCentered,
  variant: layoutPreset.variant,
}

export function getLayoutPreset(): LayoutPreset {
  return layoutPreset
}

export function isLayoutVariant(value: unknown): value is LayoutVariant {
  return typeof value === 'string' && layoutVariants.includes(value as LayoutVariant)
}

export function isLayoutMainWidth(value: unknown): value is LayoutMainWidth {
  return typeof value === 'string' && layoutMainWidths.includes(value as LayoutMainWidth)
}

export function isThemeName(value: unknown): value is ThemeName {
  return value === systemThemeName || isDaisyThemeName(value)
}

export function isDaisyThemeName(value: unknown): value is DaisyThemeName {
  return typeof value === 'string'
    && value !== systemThemeName
    && (/^[a-z][\w-]{0,63}$/i).test(value)
}

export function isFlushVariant(variant: LayoutVariant): boolean {
  return variant === 'sidebar-flush' || variant === 'top-nav-flush'
}

export function isTopNavVariant(variant: LayoutVariant): boolean {
  return variant === 'top-nav' || variant === 'top-nav-flush'
}
