import type { GlobalThemeOverrides } from 'naive-ui'

export type NaiveThemeMode = 'black' | 'dark' | 'light'

export interface NaiveThemeCommonPalette {
  bodyColor: string
  borderColor: string
  cardColor: string
  errorColor: string
  hoverColor: string
  infoColor: string
  modalColor: string
  popoverColor: string
  primaryColor: string
  primaryColorHover: string
  primaryColorPressed: string
  primaryColorSuppl: string
  successColor: string
  tableColor: string
  tableHeaderColor: string
  textColor1: string
  textColor2: string
  textColor3: string
  warningColor: string
}

export const naiveThemePalettes: Record<NaiveThemeMode, NaiveThemeCommonPalette> = {
  black: {
    bodyColor: '#000000',
    borderColor: '#27272a',
    cardColor: '#050505',
    errorColor: '#f87171',
    hoverColor: '#172554',
    infoColor: '#38bdf8',
    modalColor: '#050505',
    popoverColor: '#050505',
    primaryColor: '#3b82f6',
    primaryColorHover: '#1d4ed8',
    primaryColorPressed: '#1d4ed8',
    primaryColorSuppl: '#3b82f6',
    successColor: '#34d399',
    tableColor: '#050505',
    tableHeaderColor: '#0f0f0f',
    textColor1: '#fafafa',
    textColor2: '#fafafa',
    textColor3: '#a1a1aa',
    warningColor: '#fbbf24',
  },
  dark: {
    bodyColor: '#0b1020',
    borderColor: '#273244',
    cardColor: '#111827',
    errorColor: '#f87171',
    hoverColor: '#1e3a8a',
    infoColor: '#38bdf8',
    modalColor: '#111827',
    popoverColor: '#111827',
    primaryColor: '#60a5fa',
    primaryColorHover: '#2563eb',
    primaryColorPressed: '#1d4ed8',
    primaryColorSuppl: '#60a5fa',
    successColor: '#34d399',
    tableColor: '#111827',
    tableHeaderColor: '#182033',
    textColor1: '#f9fafb',
    textColor2: '#f9fafb',
    textColor3: '#a5b4c7',
    warningColor: '#fbbf24',
  },
  light: {
    bodyColor: '#f5f7fb',
    borderColor: '#e5e7eb',
    cardColor: '#ffffff',
    errorColor: '#ef4444',
    hoverColor: '#dbeafe',
    infoColor: '#0ea5e9',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
    primaryColorPressed: '#1e40af',
    primaryColorSuppl: '#2563eb',
    successColor: '#10b981',
    tableColor: '#ffffff',
    tableHeaderColor: '#f8fafc',
    textColor1: '#111827',
    textColor2: '#111827',
    textColor3: '#6b7280',
    warningColor: '#f59e0b',
  },
}

export type NaiveThemeColorKey = keyof NaiveThemeCommonPalette

export const naiveColorKeys: NaiveThemeColorKey[] = [
  'primaryColor',
  'primaryColorHover',
  'primaryColorPressed',
  'hoverColor',
  'bodyColor',
  'cardColor',
  'tableHeaderColor',
  'borderColor',
  'textColor1',
  'textColor3',
  'infoColor',
  'successColor',
  'warningColor',
  'errorColor',
]

export const naiveRadiusScale = ['0px', '4px', '6px', '8px', '12px', '16px'] as const

export type NaiveThemeRadius = (typeof naiveRadiusScale)[number]

export const naiveSizeScale = ['28px', '32px', '34px', '38px', '42px'] as const

export type NaiveThemeSize = (typeof naiveSizeScale)[number]

export interface NaiveThemeDraft {
  common: NaiveThemeCommonPalette & {
    borderRadius: NaiveThemeRadius
    borderRadiusSmall: NaiveThemeRadius
    boxShadow1: string
    boxShadow2: string
    boxShadow3: string
    heightLarge: NaiveThemeSize
    heightMedium: NaiveThemeSize
    heightSmall: NaiveThemeSize
  }
  DataTable: {
    borderRadius: NaiveThemeRadius
  }
  Menu: {
    borderRadius: NaiveThemeRadius
  }
  name: string
}

const depthShadowOverrides = {
  boxShadow1: '0 1px 2px -2px rgba(0, 0, 0, .18), 0 3px 6px 0 rgba(0, 0, 0, .10), 0 5px 12px 4px rgba(0, 0, 0, .06)',
  boxShadow2: '0 3px 6px -4px rgba(0, 0, 0, .18), 0 6px 12px 0 rgba(0, 0, 0, .10), 0 9px 18px 8px rgba(0, 0, 0, .06)',
  boxShadow3: '0 6px 16px -9px rgba(0, 0, 0, .18), 0 9px 28px 0 rgba(0, 0, 0, .08), 0 12px 48px 16px rgba(0, 0, 0, .04)',
} as const

const flatShadowOverrides = {
  boxShadow1: 'none',
  boxShadow2: 'none',
  boxShadow3: 'none',
} as const

export function createNaiveThemeDraft(mode: NaiveThemeMode): NaiveThemeDraft {
  return {
    common: {
      ...naiveThemePalettes[mode],
      ...depthShadowOverrides,
      borderRadius: '8px',
      borderRadiusSmall: '6px',
      heightLarge: '38px',
      heightMedium: '34px',
      heightSmall: '28px',
    },
    DataTable: {
      borderRadius: '8px',
    },
    Menu: {
      borderRadius: '6px',
    },
    name: mode,
  }
}

export function cloneNaiveThemeDraft(draft: NaiveThemeDraft): NaiveThemeDraft {
  return {
    ...draft,
    common: { ...draft.common },
    DataTable: { ...draft.DataTable },
    Menu: { ...draft.Menu },
  }
}

export function sanitizeNaiveThemeDraft(value: unknown, mode: NaiveThemeMode): NaiveThemeDraft {
  const fallback = createNaiveThemeDraft(mode)
  if (!value || typeof value !== 'object') {
    return fallback
  }

  const input = value as Partial<NaiveThemeDraft> & {
    common?: Partial<NaiveThemeDraft['common']>
    DataTable?: Partial<NaiveThemeDraft['DataTable']>
    Menu?: Partial<NaiveThemeDraft['Menu']>
  }
  const common = { ...fallback.common }
  for (const key of naiveColorKeys) {
    const color = input.common?.[key]
    if (isNonEmptyString(color)) {
      common[key] = color
    }
  }

  common.modalColor = isNonEmptyString(input.common?.modalColor) ? input.common.modalColor : common.cardColor
  common.popoverColor = isNonEmptyString(input.common?.popoverColor) ? input.common.popoverColor : common.cardColor
  common.primaryColorSuppl = isNonEmptyString(input.common?.primaryColorSuppl)
    ? input.common.primaryColorSuppl
    : common.primaryColor
  common.tableColor = isNonEmptyString(input.common?.tableColor) ? input.common.tableColor : common.cardColor
  common.textColor2 = isNonEmptyString(input.common?.textColor2) ? input.common.textColor2 : common.textColor1
  common.borderRadius = isNaiveRadius(input.common?.borderRadius)
    ? input.common.borderRadius
    : fallback.common.borderRadius
  common.borderRadiusSmall = isNaiveRadius(input.common?.borderRadiusSmall)
    ? input.common.borderRadiusSmall
    : fallback.common.borderRadiusSmall
  common.heightLarge = isNaiveSize(input.common?.heightLarge)
    ? input.common.heightLarge
    : fallback.common.heightLarge
  common.heightMedium = isNaiveSize(input.common?.heightMedium)
    ? input.common.heightMedium
    : fallback.common.heightMedium
  common.heightSmall = isNaiveSize(input.common?.heightSmall)
    ? input.common.heightSmall
    : fallback.common.heightSmall
  common.boxShadow1 = isNonEmptyString(input.common?.boxShadow1) ? input.common.boxShadow1 : fallback.common.boxShadow1
  common.boxShadow2 = isNonEmptyString(input.common?.boxShadow2) ? input.common.boxShadow2 : fallback.common.boxShadow2
  common.boxShadow3 = isNonEmptyString(input.common?.boxShadow3) ? input.common.boxShadow3 : fallback.common.boxShadow3

  return {
    common,
    DataTable: {
      borderRadius: isNaiveRadius(input.DataTable?.borderRadius)
        ? input.DataTable.borderRadius
        : fallback.DataTable.borderRadius,
    },
    Menu: {
      borderRadius: isNaiveRadius(input.Menu?.borderRadius)
        ? input.Menu.borderRadius
        : fallback.Menu.borderRadius,
    },
    name: isNonEmptyString(input.name) ? input.name : fallback.name,
  }
}

export function createNaiveThemeOverrides(mode: NaiveThemeMode): GlobalThemeOverrides {
  return createNaiveThemeOverridesFromDraft(createNaiveThemeDraft(mode))
}

export function createNaiveThemeOverridesFromDraft(draft: NaiveThemeDraft): GlobalThemeOverrides {
  const common = draft.common

  return {
    common: {
      ...common,
      dividerColor: common.borderColor,
      errorColorHover: common.errorColor,
      errorColorPressed: common.errorColor,
      infoColorHover: common.infoColor,
      infoColorPressed: common.infoColor,
      successColorHover: common.successColor,
      successColorPressed: common.successColor,
      warningColorHover: common.warningColor,
      warningColorPressed: common.warningColor,
    },
    DataTable: {
      borderColor: common.borderColor,
      borderRadius: draft.DataTable.borderRadius,
      thColor: common.tableHeaderColor,
      thColorHover: common.tableHeaderColor,
      thColorModal: common.tableHeaderColor,
      thColorPopover: common.tableHeaderColor,
      thColorSorting: common.tableHeaderColor,
      thFontWeight: '600',
      thTextColor: common.textColor1,
      tdColor: common.tableColor,
      tdColorHover: common.tableHeaderColor,
      tdColorModal: common.tableColor,
      tdColorPopover: common.tableColor,
      tdColorSorting: common.tableHeaderColor,
      tdColorStriped: common.tableColor,
      tdTextColor: common.textColor1,
    },
    Menu: {
      arrowColorActive: '#ffffff',
      arrowColorActiveHover: '#ffffff',
      arrowColorChildActive: common.primaryColor,
      arrowColorChildActiveHover: common.primaryColorHover,
      borderRadius: draft.Menu.borderRadius,
      color: 'transparent',
      itemColorActive: common.primaryColor,
      itemColorActiveCollapsed: common.primaryColor,
      itemColorActiveHover: common.primaryColor,
      itemColorHover: common.hoverColor,
      itemIconColorActive: '#ffffff',
      itemIconColorActiveHover: '#ffffff',
      itemIconColorChildActive: common.primaryColor,
      itemIconColorChildActiveHover: common.primaryColorHover,
      itemTextColorActive: '#ffffff',
      itemTextColorActiveHover: '#ffffff',
      itemTextColorChildActive: common.primaryColor,
      itemTextColorChildActiveHover: common.primaryColorHover,
    },
  }
}

export function setNaiveDraftDepth(draft: NaiveThemeDraft, enabled: boolean): NaiveThemeDraft {
  return {
    ...draft,
    common: {
      ...draft.common,
      ...(enabled ? depthShadowOverrides : flatShadowOverrides),
    },
  }
}

export function hasNaiveDraftDepth(draft: NaiveThemeDraft): boolean {
  return draft.common.boxShadow1 !== 'none'
}

export function buildNaiveThemeOverridesSnippet(mode: NaiveThemeMode): string {
  return buildNaiveThemeOverridesSnippetFromDraft(createNaiveThemeDraft(mode))
}

export function buildNaiveThemeOverridesSnippetFromDraft(draft: NaiveThemeDraft): string {
  return [
    'import type { GlobalThemeOverrides } from \'naive-ui\'',
    '',
    'export const consoleThemeOverrides: GlobalThemeOverrides = ',
    JSON.stringify(createNaiveThemeOverridesFromDraft(draft), null, 2),
    '',
  ].join('\n')
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNaiveRadius(value: unknown): value is NaiveThemeRadius {
  return typeof value === 'string' && (naiveRadiusScale as readonly string[]).includes(value)
}

function isNaiveSize(value: unknown): value is NaiveThemeSize {
  return typeof value === 'string' && (naiveSizeScale as readonly string[]).includes(value)
}
