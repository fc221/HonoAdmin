export const layoutConfigStorageKey = 'hono-admin:config'

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

export interface LayoutConfig {
  mainWidth: LayoutMainWidth
  sidebarCollapsed: boolean
  sidebarLogoStyle: LayoutSidebarLogoStyle
  sidebarMenuStyle: LayoutSidebarMenuStyle
  topMenuCentered: boolean
  variant: LayoutVariant
}

export const defaultLayoutConfig: LayoutConfig = {
  mainWidth: 'narrow',
  sidebarCollapsed: false,
  sidebarLogoStyle: 'brand',
  sidebarMenuStyle: 'card',
  topMenuCentered: true,
  variant: 'sidebar',
}

export const layoutVariantOptions: Array<{
  label: string
  value: LayoutVariant
}> = [
  { label: '侧边栏', value: 'sidebar' },
  { label: '侧边栏贴边', value: 'sidebar-flush' },
  { label: '顶部导航', value: 'top-nav' },
  { label: '顶部贴边', value: 'top-nav-flush' },
  { label: '综合布局', value: 'hybrid' },
  { label: '综合贴边', value: 'hybrid-flush' },
]

export const sidebarLogoStyleOptions: Array<{
  label: string
  value: LayoutSidebarLogoStyle
}> = [
  { label: '品牌卡片', value: 'brand' },
  { label: '简洁', value: 'plain' },
  { label: '隐藏', value: 'hidden' },
]

export const sidebarMenuStyleOptions: Array<{
  label: string
  value: LayoutSidebarMenuStyle
}> = [
  { label: '卡片', value: 'card' },
  { label: '简洁', value: 'plain' },
]

export function isLayoutVariant(value: unknown): value is LayoutVariant {
  return typeof value === 'string' && layoutVariants.includes(value as LayoutVariant)
}

export function isLayoutMainWidth(value: unknown): value is LayoutMainWidth {
  return typeof value === 'string' && layoutMainWidths.includes(value as LayoutMainWidth)
}

export function isLayoutSidebarLogoStyle(value: unknown): value is LayoutSidebarLogoStyle {
  return typeof value === 'string'
    && layoutSidebarLogoStyles.includes(value as LayoutSidebarLogoStyle)
}

export function isLayoutSidebarMenuStyle(value: unknown): value is LayoutSidebarMenuStyle {
  return typeof value === 'string'
    && layoutSidebarMenuStyles.includes(value as LayoutSidebarMenuStyle)
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

export function isFlushVariant(variant: LayoutVariant): boolean {
  return variant === 'sidebar-flush'
    || variant === 'top-nav-flush'
    || variant === 'hybrid-flush'
}

export function hasMobileSidebarVariant(variant: LayoutVariant): boolean {
  return isSidebarVariant(variant)
    || isTopNavVariant(variant)
    || isHybridVariant(variant)
}

export function hasCollapsibleSidebarVariant(variant: LayoutVariant): boolean {
  return isSidebarVariant(variant) || isHybridVariant(variant)
}

export function isConsoleImplementedVariant(variant: LayoutVariant): boolean {
  return layoutVariants.includes(variant)
}

export function buildLayoutConfigSnippet(config: LayoutConfig): string {
  return [
    'export const layoutPreset = ',
    JSON.stringify(config, null, 2),
    ' as const',
    '',
  ].join('')
}
