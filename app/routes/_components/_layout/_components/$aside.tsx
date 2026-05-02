import type { ThemeName } from '../$context'
import Theme from './$theme'

interface Props {
  theme: ThemeName
  id: string
  isDesktop: boolean
  isAsideOpen: boolean
  isCollapsed: boolean
  onToggle: () => void
  onThemeChange: (theme: ThemeName) => void
}

export default function Aside({
  theme,
  id,
  isDesktop,
  isAsideOpen,
  isCollapsed,
  onToggle,
  onThemeChange,
}: Props) {
  const isDesktopCollapsed = isDesktop && isCollapsed
  const mobileOverlayClass = isDesktop
    ? 'bg-transparent opacity-0'
    : isAsideOpen
      ? 'bg-black/30 opacity-100'
      : 'bg-black/0 opacity-0'

  return (
    <aside class="drawer-side h-full! overflow-visible">
      <label
        for={id}
        aria-label="关闭侧边栏"
        // transition-[background-color,opacity] duration-200 ease-out
        class={`drawer-overlay  ${mobileOverlayClass}`}
      />
      <div
        // transition-[width,box-shadow] duration-300 ease-out
        class={`flex flex-col items-center bg-base-100 p-4 gap-3 rounded-box w-64 m-3 h-[calc(100vh-2rem)]  lg:m-0 lg:h-full ${!isDesktop && isAsideOpen ? 'shadow-2xl' : 'shadow-none'} ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* logo */}
        <div
          // transition-[padding,gap] duration-200 ease-out
          class={`bg-linear-to-br from-primary to-primary/30 rounded-box flex flex-row items-center  ${isDesktopCollapsed ? 'justify-center' : 'w-full p-4 gap-3'}`}
        >
          <div class="rounded-box bg-white/20 w-12 h-12 flex items-center justify-center">
            <span class="text-white text-lg font-bold">HA</span>
          </div>
          <div
            // transition-[max-width,opacity] duration-200 ease-out
            class={`overflow-hidden whitespace-nowrap text-white font-bold text-lg  ${isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'}`}
          >
            HonoAdmin
          </div>
        </div>
        {/* menu */}
        <ul
          class={`menu p-4 flex-1 bg-base-200 rounded-box w-full gap-1 ${isDesktopCollapsed ? 'hidden' : ''}`}
        >
          <li>
            <a href="/admin">
              <i class="icon-[ri--dashboard-line]"></i>
              {' '}
              <span>控制台</span>
            </a>
          </li>
          <li>
            <a href="/admin/config">
              <i class="icon-[ri--settings-3-line]"></i>
              {' '}
              <span>配置管理</span>
            </a>
          </li>
          <li>
            <a href="/admin/user">
              <i class="icon-[ri--user-settings-line]"></i>
              {' '}
              <span>用户管理</span>
            </a>
          </li>
        </ul>
        <div class={isDesktopCollapsed ? 'flex flex-1' : 'hidden'}>
          <CollapsedMenu />
        </div>
        {/* aside options */}
        <div
          // transition-[gap] transition-discrete
          class={`w-full pt-2 gap-2 border-t border-base-300  ${isDesktopCollapsed ? 'flex flex-col items-center' : 'flex flex-row items-center justify-between'}`}
        >
          <Theme theme={theme} onThemeChange={onThemeChange} />
          {/* options collapsed */}
          <button
            // transition-colors transition-discrete
            class={`btn btn-ghost  ${isDesktopCollapsed ? 'btn-circle' : ''}`}
            type="button"
            onClick={onToggle}
          >
            <i
              class={
                !isDesktop
                  ? 'icon-[ri--close-line]'
                  : isDesktopCollapsed
                    ? 'icon-[ri--arrow-right-double-fill]'
                    : 'icon-[ri--arrow-left-double-fill]'
              }
            >
            </i>
            <span
              class={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out ${isDesktopCollapsed ? 'max-w-0 opacity-0 absolute' : 'max-w-32 opacity-100'}`}
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

function CollapsedMenu() {
  return (
    <ul class="menu flex-1 p-0">
      <li>
        <button
          class="menu-active"
          popovertarget="aside-menu-dropdown"
          style="anchor-name:--aside-menu-dropdown"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </button>
        <ul
          class="dropdown dropdown-right menu w-52 rounded-box bg-base-100"
          popover="auto"
          id="aside-menu-dropdown"
          style="position-anchor:--aside-menu-dropdown"
        >
          <li>
            <a href="/admin/config">配置管理</a>
          </li>
          <li>
            <a href="/admin/user">用户管理</a>
          </li>
        </ul>
      </li>
    </ul>
  )
}
