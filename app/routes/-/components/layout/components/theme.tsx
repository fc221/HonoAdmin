import { defaultLayoutConfig } from '../config'

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

export default function Theme() {
  const selectedTheme = defaultLayoutConfig.theme

  return (
    <div data-controller="theme">
      <button
        class="btn btn-circle btn-ghost"
        aria-label="切换主题"
        popovertarget="aside-theme-dropdown"
        style="anchor-name:--aside-theme-dropdown"
        type="button"
      >
        <i class="icon-[ri--palette-line]"></i>
      </button>
      <ul
        popover="auto"
        id="aside-theme-dropdown"
        style="position-anchor:--aside-theme-dropdown"
        class="dropdown dropdown-top menu p-3 z-1 mb-3 w-44 rounded-box bg-base-100 shadow space-y-1"
      >
        {themeOptions.map((option) => (
          <li key={option.value}>
            <button
              aria-pressed={selectedTheme === option.value}
              class={`justify-start gap-2 ${selectedTheme === option.value ? 'menu-active' : ''}`}
              data-action="theme#select"
              data-theme-target="option"
              data-theme-value={option.value}
              type="button"
            >
              <i class={option.icon}></i>
              <span class="flex-1 text-left">{option.label}</span>
              <i
                class={`icon-[ri--check-line] ml-auto ${selectedTheme === option.value ? '' : 'hidden'}`}
                data-theme-target="check"
                data-theme-value={option.value}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
