import type { NaiveThemeColorKey } from '../../theme/naive-theme'

export const radiusLabels = ['0', '4', '6', '8', '12', '16']

export const sizeLabels = ['XS', 'S', 'M', 'L', 'XL']

export const colorPickerModes: Array<'hex'> = ['hex']

export const presetColors = [
  '#FFFFFF',
  '#F8FAFC',
  '#E5E7EB',
  '#94A3B8',
  '#111827',
  '#000000',
  '#2563EB',
  '#422AD5',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  'rgba(208, 48, 80, 1)',
]

export const colorGroups: Array<{
  pairs: Array<{ key: NaiveThemeColorKey, label: string }>
  title: string
}> = [
  {
    pairs: [
      { key: 'primaryColor', label: 'Primary' },
      { key: 'primaryColorHover', label: 'Primary Hover' },
      { key: 'primaryColorPressed', label: 'Primary Pressed' },
      { key: 'hoverColor', label: 'Hover' },
    ],
    title: '品牌',
  },
  {
    pairs: [
      { key: 'bodyColor', label: 'Body' },
      { key: 'cardColor', label: 'Card' },
      { key: 'tableHeaderColor', label: 'Table Header' },
      { key: 'borderColor', label: 'Border' },
    ],
    title: '基础',
  },
  {
    pairs: [
      { key: 'textColor1', label: 'Text 1' },
      { key: 'textColor2', label: 'Text 2' },
      { key: 'textColor3', label: 'Text 3' },
    ],
    title: '文本',
  },
  {
    pairs: [
      { key: 'infoColor', label: 'Info' },
      { key: 'successColor', label: 'Success' },
      { key: 'warningColor', label: 'Warning' },
      { key: 'errorColor', label: 'Error' },
    ],
    title: '状态',
  },
]
