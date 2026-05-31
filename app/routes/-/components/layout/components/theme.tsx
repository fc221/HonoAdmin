import { defaultLayoutConfig } from '../config'
import { themeOptions } from './theme-options'

type Placement = 'bottom-end' | 'top'

interface Props {
  buttonClassName?: string
  id?: string
  placement?: Placement
}

export default function Theme({
  buttonClassName = 'btn btn-circle btn-ghost',
  id = 'aside-theme-dropdown',
  placement = 'top',
}: Props) {
  const anchorName = `--${id}`
  const selectedTheme = defaultLayoutConfig.theme
  const popoverClass = placement === 'bottom-end'
    ? 'dropdown dropdown-end menu p-3 z-1 mt-3 w-44 rounded-box bg-base-100 shadow space-y-1'
    : 'dropdown dropdown-top menu p-3 z-1 mb-3 w-44 rounded-box bg-base-100 shadow space-y-1'

  return (
    <div data-controller="theme">
      <button
        class={buttonClassName}
        aria-label="切换主题"
        popovertarget={id}
        style={`anchor-name:${anchorName}`}
        type="button"
      >
        <i class="icon-[ri--palette-line]"></i>
      </button>
      <ul
        popover="auto"
        id={id}
        style={`position-anchor:${anchorName}`}
        class={popoverClass}
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
