export const layoutConfigStorageKey = 'hono-admin:config'

export const layoutVariantCookieName = 'hono-admin.layout-variant'

export const customThemeStyleId = 'hono-admin-custom-theme'

export const systemThemeQuery = '(prefers-color-scheme: dark)'

export const desktopBreakpoint = 1024

export const themeNames = ['system', 'light', 'dark', 'black'] as const

export type ThemeName = (typeof themeNames)[number]

export type DaisyThemeName = Exclude<ThemeName, 'system'>

export const layoutVariants = [
  'sidebar',
  'sidebar-flush',
  'top-nav',
  'top-nav-flush',
] as const

export type LayoutVariant = (typeof layoutVariants)[number]

export const radiusScale = ['0', '0.25rem', '0.5rem', '1rem', '2rem'] as const

export type RadiusValue = (typeof radiusScale)[number]

export const sizeScale = ['0.1875rem', '0.21875rem', '0.25rem', '0.28125rem', '0.3125rem'] as const

export type SizeValue = (typeof sizeScale)[number]

export const borderWidthScale = ['0px', '0.5px', '1px', '1.5px', '2px'] as const

export type BorderWidthValue = (typeof borderWidthScale)[number]

export interface DaisyColorPalette {
  'primary': string
  'primary-content': string
  'secondary': string
  'secondary-content': string
  'accent': string
  'accent-content': string
  'neutral': string
  'neutral-content': string
  'base-100': string
  'base-200': string
  'base-300': string
  'base-content': string
  'info': string
  'info-content': string
  'success': string
  'success-content': string
  'warning': string
  'warning-content': string
  'error': string
  'error-content': string
}

export interface DaisyTheme {
  colors: DaisyColorPalette
  radiusBox: RadiusValue
  radiusField: RadiusValue
  radiusSelector: RadiusValue
  sizeField: SizeValue
  sizeSelector: SizeValue
  borderWidth: BorderWidthValue
  depth: boolean
  noise: boolean
}

export const lightThemeDefaults: DaisyTheme = {
  colors: {
    'primary': 'oklch(45% 0.24 277.023)',
    'primary-content': 'oklch(96% 0.018 272.314)',
    'secondary': 'oklch(65% 0.241 354.308)',
    'secondary-content': 'oklch(94% 0.028 342.258)',
    'accent': 'oklch(77% 0.152 181.912)',
    'accent-content': 'oklch(38% 0.063 188.416)',
    'neutral': 'oklch(14% 0.005 285.823)',
    'neutral-content': 'oklch(92% 0.004 286.32)',
    'base-100': 'oklch(100% 0 0)',
    'base-200': 'oklch(98% 0 0)',
    'base-300': 'oklch(95% 0 0)',
    'base-content': 'oklch(21% 0.006 285.885)',
    'info': 'oklch(74% 0.16 232.661)',
    'info-content': 'oklch(29% 0.066 243.157)',
    'success': 'oklch(76% 0.177 163.223)',
    'success-content': 'oklch(37% 0.077 168.94)',
    'warning': 'oklch(82% 0.189 84.429)',
    'warning-content': 'oklch(41% 0.112 45.904)',
    'error': 'oklch(71% 0.194 13.428)',
    'error-content': 'oklch(27% 0.105 12.094)',
  },
  radiusBox: '1rem',
  radiusField: '0.5rem',
  radiusSelector: '0.5rem',
  sizeField: '0.25rem',
  sizeSelector: '0.25rem',
  borderWidth: '1px',
  depth: true,
  noise: false,
}

export interface LayoutPreset {
  defaultTheme: ThemeName
  variant: LayoutVariant
  customTheme: DaisyTheme
}

export interface LayoutConfig {
  sidebarCollapsed: boolean
  theme: ThemeName
  variant: LayoutVariant
  customTheme: DaisyTheme
}

export const defaultLayoutConfig: LayoutConfig = {
  sidebarCollapsed: false,
  theme: 'light',
  variant: 'sidebar',
  customTheme: lightThemeDefaults,
}

export const layoutPreset: LayoutPreset = {
  defaultTheme: 'light',
  variant: 'sidebar',
  customTheme: lightThemeDefaults,
}

export function getLayoutPreset(): LayoutPreset {
  return layoutPreset
}

export function isLayoutVariant(value: unknown): value is LayoutVariant {
  return typeof value === 'string' && layoutVariants.includes(value as LayoutVariant)
}

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && themeNames.includes(value as ThemeName)
}

export function isFlushVariant(variant: LayoutVariant): boolean {
  return variant === 'sidebar-flush' || variant === 'top-nav-flush'
}

export function isTopNavVariant(variant: LayoutVariant): boolean {
  return variant === 'top-nav' || variant === 'top-nav-flush'
}

export function isRadiusValue(value: unknown): value is RadiusValue {
  return typeof value === 'string' && (radiusScale as readonly string[]).includes(value)
}

export function isSizeValue(value: unknown): value is SizeValue {
  return typeof value === 'string' && (sizeScale as readonly string[]).includes(value)
}

export function isBorderWidthValue(value: unknown): value is BorderWidthValue {
  return typeof value === 'string' && (borderWidthScale as readonly string[]).includes(value)
}

export const daisyColorKeys: Array<keyof DaisyColorPalette> = [
  'primary',
  'primary-content',
  'secondary',
  'secondary-content',
  'accent',
  'accent-content',
  'neutral',
  'neutral-content',
  'base-100',
  'base-200',
  'base-300',
  'base-content',
  'info',
  'info-content',
  'success',
  'success-content',
  'warning',
  'warning-content',
  'error',
  'error-content',
]

export function sanitizeCustomTheme(value: unknown): DaisyTheme {
  if (!value || typeof value !== 'object') {
    return lightThemeDefaults
  }
  const input = value as Partial<DaisyTheme> & { colors?: Partial<DaisyColorPalette> }
  const colors: DaisyColorPalette = { ...lightThemeDefaults.colors }
  if (input.colors && typeof input.colors === 'object') {
    for (const key of daisyColorKeys) {
      const v = input.colors[key]
      if (typeof v === 'string' && v.trim().length > 0) {
        colors[key] = v
      }
    }
  }
  return {
    colors,
    radiusBox: isRadiusValue(input.radiusBox) ? input.radiusBox : lightThemeDefaults.radiusBox,
    radiusField: isRadiusValue(input.radiusField) ? input.radiusField : lightThemeDefaults.radiusField,
    radiusSelector: isRadiusValue(input.radiusSelector) ? input.radiusSelector : lightThemeDefaults.radiusSelector,
    sizeField: isSizeValue(input.sizeField) ? input.sizeField : lightThemeDefaults.sizeField,
    sizeSelector: isSizeValue(input.sizeSelector) ? input.sizeSelector : lightThemeDefaults.sizeSelector,
    borderWidth: isBorderWidthValue(input.borderWidth) ? input.borderWidth : lightThemeDefaults.borderWidth,
    depth: typeof input.depth === 'boolean' ? input.depth : lightThemeDefaults.depth,
    noise: typeof input.noise === 'boolean' ? input.noise : lightThemeDefaults.noise,
  }
}

export function customThemeToCssVars(theme: DaisyTheme): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const key of daisyColorKeys) {
    vars[`--color-${key}`] = theme.colors[key]
  }
  vars['--radius-box'] = theme.radiusBox
  vars['--radius-field'] = theme.radiusField
  vars['--radius-selector'] = theme.radiusSelector
  vars['--size-field'] = theme.sizeField
  vars['--size-selector'] = theme.sizeSelector
  vars['--border'] = theme.borderWidth
  vars['--depth'] = theme.depth ? '1' : '0'
  vars['--noise'] = theme.noise ? '1' : '0'
  return vars
}

export function buildCustomThemeCss(theme: DaisyTheme): string {
  const vars = customThemeToCssVars(theme)
  const lines = Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`)
  return `:root{\n${lines.join('\n')}\n}`
}
