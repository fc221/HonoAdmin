import type { ThemeName } from '../$context'

const themeOptions = [
  {
    label: '系统',
    value: 'system',
    icon: 'icon-[ri--computer-line]',
  },
  {
    label: '亮色',
    value: 'light',
    icon: 'icon-[ri--sun-line]',
  },
  {
    label: '暗色',
    value: 'dark',
    icon: 'icon-[ri--moon-clear-line]',
  },
  {
    label: '纯黑',
    value: 'black',
    icon: 'icon-[ri--contrast-2-line]',
  },
] as const

interface Props {
  theme: ThemeName
  onThemeChange: (theme: ThemeName) => void
}

export default function Theme({ theme, onThemeChange }: Props) {
  return (
    <div>
      <button
        class="btn btn-circle btn-ghost"
        aria-label="切换主题"
        popovertarget="aside-theme-dropdown"
        style="anchor-name:--aside-theme-dropdown"
      >
        <i class="icon-[ri--palette-line]"></i>
      </button>
      <ul
        popover="auto"
        id="aside-theme-dropdown"
        style="position-anchor:--aside-theme-dropdown"
        class="dropdown dropdown-top menu z-1 mb-3 w-44 rounded-box bg-base-100 p-2 border border-base-300"
      >
        {themeOptions.map((option) => (
          <li key={option.value}>
            <label
              class="label cursor-pointer justify-start gap-2 rounded-btn px-3 py-2 hover:bg-base-200"
              onClick={() => onThemeChange(option.value)}
            >
              <input
                type="radio"
                name="theme-dropdown"
                class="radio radio-sm"
                aria-label={option.label}
                value={option.value}
                checked={theme === option.value}
              />
              <i class={option.icon}></i>
              <span>{option.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
