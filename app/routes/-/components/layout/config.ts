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
  'hybrid',
  'hybrid-flush',
] as const

export type LayoutVariant = (typeof layoutVariants)[number]

export const layoutMainWidths = ['wide', 'narrow'] as const

export type LayoutMainWidth = (typeof layoutMainWidths)[number]

export const layoutSidebarLogoStyles = ['brand', 'plain', 'hidden'] as const

export type LayoutSidebarLogoStyle = (typeof layoutSidebarLogoStyles)[number]

export const layoutSidebarMenuStyles = ['card', 'plain'] as const

export type LayoutSidebarMenuStyle = (typeof layoutSidebarMenuStyles)[number]

export interface LayoutPreset {
  defaultTheme: ThemeName
  mainWidth: LayoutMainWidth
  sidebarCollapsed: boolean
  sidebarLogoStyle: LayoutSidebarLogoStyle
  sidebarMenuStyle: LayoutSidebarMenuStyle
  topMenuCentered: boolean
  variant: LayoutVariant
}

export interface LayoutConfig {
  mainWidth: LayoutMainWidth
  sidebarCollapsed: boolean
  sidebarLogoStyle: LayoutSidebarLogoStyle
  sidebarMenuStyle: LayoutSidebarMenuStyle
  theme: ThemeName
  topMenuCentered: boolean
  variant: LayoutVariant
}

export const layoutPreset: LayoutPreset = {
  defaultTheme: 'light',
  mainWidth: 'narrow',
  sidebarCollapsed: false,
  sidebarLogoStyle: 'brand',
  sidebarMenuStyle: 'card',
  topMenuCentered: true,
  variant: 'sidebar',
}

export const defaultLayoutConfig: LayoutConfig = {
  mainWidth: layoutPreset.mainWidth,
  sidebarCollapsed: layoutPreset.sidebarCollapsed,
  sidebarLogoStyle: layoutPreset.sidebarLogoStyle,
  sidebarMenuStyle: layoutPreset.sidebarMenuStyle,
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

export function isLayoutSidebarLogoStyle(
  value: unknown,
): value is LayoutSidebarLogoStyle {
  return typeof value === 'string'
    && layoutSidebarLogoStyles.includes(value as LayoutSidebarLogoStyle)
}

export function isLayoutSidebarMenuStyle(
  value: unknown,
): value is LayoutSidebarMenuStyle {
  return typeof value === 'string'
    && layoutSidebarMenuStyles.includes(value as LayoutSidebarMenuStyle)
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
  return variant === 'sidebar-flush'
    || variant === 'top-nav-flush'
    || variant === 'hybrid-flush'
}

export function isTopNavVariant(variant: LayoutVariant): boolean {
  return variant === 'top-nav' || variant === 'top-nav-flush'
}

export function isHybridVariant(variant: LayoutVariant): boolean {
  return variant === 'hybrid' || variant === 'hybrid-flush'
}

export function isSidebarVariant(variant: LayoutVariant): boolean {
  return variant === 'sidebar' || variant === 'sidebar-flush'
}

export function hasMobileSidebarVariant(variant: LayoutVariant): boolean {
  return isSidebarVariant(variant)
    || isTopNavVariant(variant)
    || isHybridVariant(variant)
}

export function hasCollapsibleSidebarVariant(variant: LayoutVariant): boolean {
  return isSidebarVariant(variant) || isHybridVariant(variant)
}
