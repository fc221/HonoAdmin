import type { ThemeName } from '../config'

export const themeOptions: Array<{
  label: string
  value: ThemeName
  icon: string
}> = [
  { label: '系统', value: 'system', icon: 'icon-[ri--computer-line]' },
  { label: '亮色', value: 'light', icon: 'icon-[ri--sun-line]' },
  { label: '暗色', value: 'dark', icon: 'icon-[ri--moon-clear-line]' },
  { label: '纯黑', value: 'black', icon: 'icon-[ri--contrast-2-line]' },
]
