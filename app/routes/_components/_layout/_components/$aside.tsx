import type { MenuItem } from '../../../../service/admin/system/menu/consts'
import type { ThemeName } from '../config'
import { isMenuItemActive } from '../../../../service/admin/system/menu'
import { getSiteLogoText } from '../../../_utils/branding'
import Menu from './$menu'
import Theme from './$theme'

interface Props {
  currentMenuName: string
  theme: ThemeName
  id: string
  isDesktop: boolean
  isAsideOpen: boolean
  isCollapsed: boolean
  menus: MenuItem[]
  onMenuNavigate: () => void
  onToggle: () => void
  onThemeChange: (theme: ThemeName) => void
  siteTitle: string
}

export default function Aside({
  currentMenuName,
  theme,
  id,
  isDesktop,
  isAsideOpen,
  isCollapsed,
  menus,
  onMenuNavigate,
  onToggle,
  onThemeChange,
  siteTitle,
}: Props) {
  const isDesktopCollapsed = isDesktop && isCollapsed
  const mobileOverlayClass = isDesktop
    ? 'bg-transparent opacity-0'
    : isAsideOpen
      ? 'bg-black/30 opacity-100'
      : 'bg-black/0 opacity-0'

  return (
    <aside class="drawer-side h-full! overflow-hidden z-99">
      <label
        for={id}
        aria-label="关闭侧边栏"
        class={`drawer-overlay transition-[background-color,opacity] duration-150 ease-out ${mobileOverlayClass}`}
      />
      <div
        data-layout-aside-panel
        class={`flex min-w-0 flex-col items-center overflow-x-hidden bg-base-100 p-4 gap-3 rounded-box w-64 m-3 h-[calc(100vh-2rem)] transition-[width,box-shadow] duration-150 ease-out lg:m-0 lg:h-full ${!isDesktop && isAsideOpen ? 'shadow-2xl' : 'shadow-none'} ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* logo */}
        <div
          data-layout-aside-logo
          class={`bg-linear-to-br from-primary to-primary/30 rounded-box flex max-w-full min-w-0 flex-row items-center overflow-hidden transition-[padding,gap,width] duration-150 ease-out ${isDesktopCollapsed ? 'justify-center' : 'w-full p-4 gap-3'}`}
        >
          <div class="rounded-box bg-white/20 w-12 h-12 flex items-center justify-center">
            <span class="text-white text-lg font-bold">{getSiteLogoText(siteTitle)}</span>
          </div>
          <div
            data-layout-aside-brand
            class={`overflow-hidden whitespace-nowrap text-white font-bold text-lg transition-[max-width,opacity] duration-150 ease-out ${isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'}`}
          >
            {siteTitle}
          </div>
        </div>
        {/* menu */}
        <div class="w-full min-w-0 flex-1 min-h-0 overflow-x-hidden p-4 bg-base-200 rounded-box">
          <Menu
            dataLayoutMenuExpanded
            currentMenuName={currentMenuName}
            items={menus}
            className={`menu p-0 w-full h-full space-y-1 overflow-y-auto flex-nowrap ${isDesktopCollapsed ? 'hidden' : ''}`}
            onNavigate={onMenuNavigate}
          />
          <div
            data-layout-menu-collapsed
            class={`min-w-0 justify-center ${isDesktopCollapsed ? 'flex' : 'hidden'}`}
          >
            <CollapsedMenu
              currentMenuName={currentMenuName}
              items={menus}
              onNavigate={onMenuNavigate}
            />
          </div>
        </div>
        {/* aside options */}
        <div
          data-layout-aside-options
          class={`w-full max-w-full min-w-0 overflow-hidden pt-2 gap-2 border-t border-base-300 transition-[gap] duration-150 ease-out ${isDesktopCollapsed ? 'flex flex-col items-center' : 'flex flex-row items-center justify-between'}`}
        >
          <Theme theme={theme} onThemeChange={onThemeChange} />
          {/* options collapsed */}
          <button
            data-layout-aside-toggle
            class={`btn btn-ghost transition-[border-radius] duration-150 ease-out ${isDesktopCollapsed ? 'btn-circle' : ''}`}
            type="button"
            onClick={onToggle}
          >
            <i
              data-layout-icon-mobile
              class={`${!isDesktop ? 'inline-block' : 'hidden'} icon-[ri--close-line]`}
            >
            </i>
            <i
              data-layout-icon-desktop-expanded
              class={`${isDesktop && !isDesktopCollapsed ? 'inline-block' : 'hidden'} icon-[ri--arrow-left-double-fill]`}
            >
            </i>
            <i
              data-layout-icon-desktop-collapsed
              class={`${isDesktopCollapsed ? 'inline-block' : 'hidden'} icon-[ri--arrow-right-double-fill]`}
            >
            </i>
            <span
              data-layout-aside-toggle-label
              class={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out ${isDesktopCollapsed ? 'max-w-0 opacity-0 absolute' : 'max-w-32 opacity-100'}`}
            >
              {!isDesktop
                ? isAsideOpen
                  ? '关闭导航'
                  : '打开导航'
                : '折叠导航'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

function CollapsedMenu({
  currentMenuName,
  items,
  onNavigate,
}: {
  currentMenuName: string
  items: MenuItem[]
  onNavigate: () => void
}) {
  return (
    <ul class="menu min-w-0 items-center gap-1 p-0">
      {items.map((item) => (
        <CollapsedRootMenuItem
          currentMenuName={currentMenuName}
          item={item}
          key={item.name}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  )
}

function CollapsedRootMenuItem({
  currentMenuName,
  item,
  onNavigate,
}: {
  currentMenuName: string
  item: MenuItem
  onNavigate: () => void
}) {
  const activeClass = isMenuItemActive(item, currentMenuName)
    ? 'menu-active'
    : ''

  if (!item.children?.length) {
    if (!item.href) {
      return null
    }

    return (
      <li class="min-w-0">
        <a
          aria-label={item.label}
          class={`${activeClass} justify-center`}
          href={item.href}
          onClick={onNavigate}
          title={item.label}
        >
          <i class={`${item.icon} shrink-0`}></i>
        </a>
      </li>
    )
  }

  const popoverId = getCollapsedMenuPopoverId(item.name)
  const anchorName = `--${popoverId}`

  return (
    <li class="min-w-0">
      <button
        aria-label={item.label}
        class={`${activeClass} justify-center`}
        popovertarget={popoverId}
        style={`anchor-name:${anchorName}`}
        title={item.label}
        type="button"
      >
        <i class={`${item.icon} shrink-0`}></i>
      </button>
      <Menu
        currentMenuName={currentMenuName}
        id={popoverId}
        items={item.children}
        className="dropdown dropdown-right menu w-52 max-w-[calc(100vw-6rem)] overflow-x-hidden rounded-box bg-base-100 p-3 shadow space-y-1"
        onNavigate={onNavigate}
        popover="auto"
        style={`position-anchor:${anchorName}`}
      />
    </li>
  )
}

function getCollapsedMenuPopoverId(name: string) {
  return `aside-menu-${name.split('.').join('-')}`
}
