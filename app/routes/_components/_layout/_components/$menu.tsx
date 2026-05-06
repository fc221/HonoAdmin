import type { MenuItem } from '../../../../service/admin/system/menu'
import {
  isMenuItemActive,
  isMenuItemOpen,
} from '../../../../service/admin/system/menu'

interface MenuProps {
  className?: string
  currentMenuName: string
  items: MenuItem[]
  dataLayoutMenuExpanded?: boolean
  id?: string
  onNavigate?: () => void
  popover?: 'auto' | 'manual'
  style?: string
}

export default function Menu({
  className = 'menu',
  currentMenuName,
  items,
  dataLayoutMenuExpanded,
  id,
  onNavigate,
  popover,
  style,
}: MenuProps) {
  return (
    <ul
      data-layout-menu-expanded={dataLayoutMenuExpanded ? true : undefined}
      class={`${className} min-w-0 overflow-x-hidden`}
      id={id}
      popover={popover}
      style={style}
    >
      {items.map((item) => renderMenuItem(item, currentMenuName, onNavigate))}
    </ul>
  )
}

function renderMenuItem(
  item: MenuItem,
  currentMenuName: string,
  onNavigate: (() => void) | undefined,
) {
  if (item.children?.length) {
    return (
      <li key={item.name} class="min-w-0">
        <details class="min-w-0" open={isMenuItemOpen(item, currentMenuName)}>
          <summary
            class={`${isMenuItemActive(item, currentMenuName) ? 'menu-active' : ''} min-w-0`}
          >
            <i class={`${item.icon} shrink-0`}></i>
            <span class="min-w-0 truncate">{item.label}</span>
          </summary>
          <ul class="mt-1 min-w-0 overflow-x-hidden space-y-1">
            {item.children.map((child) =>
              renderMenuItem(child, currentMenuName, onNavigate)
            )}
          </ul>
        </details>
      </li>
    )
  }

  if (!item.href) {
    return null
  }

  return (
    <li key={item.name} class="min-w-0">
      <a
        class={`${isMenuItemActive(item, currentMenuName) ? 'menu-active' : ''} min-w-0`}
        data-pjax={item.pjax === false ? undefined : 'true'}
        href={item.href}
        onClick={onNavigate}
      >
        <i class={`${item.icon} shrink-0`}></i>
        <span class="min-w-0 truncate">{item.label}</span>
      </a>
    </li>
  )
}
