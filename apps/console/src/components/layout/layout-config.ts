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

export const layoutSidebarStyles = ['card', 'plain'] as const

export type LayoutSidebarStyle = (typeof layoutSidebarStyles)[number]

export interface LayoutConfig {
  mainWidth: LayoutMainWidth
  sidebarCollapsed: boolean
  sidebarStyle: LayoutSidebarStyle
  topMenuCentered: boolean
  variant: LayoutVariant
}

export const defaultLayoutConfig: LayoutConfig = {
  mainWidth: 'narrow',
  sidebarCollapsed: false,
  sidebarStyle: 'card',
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

export const sidebarStyleOptions: Array<{
  label: string
  value: LayoutSidebarStyle
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

export function isLayoutSidebarStyle(value: unknown): value is LayoutSidebarStyle {
  return typeof value === 'string'
    && layoutSidebarStyles.includes(value as LayoutSidebarStyle)
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
