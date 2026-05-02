interface Props {
  isReady: boolean
  isDesktop: boolean
  isAsideOpen: boolean
  isCollapsed: boolean
  onToggle: () => void
  onRefresh: () => void
}

export default function Header({
  isReady,
  isDesktop,
  isAsideOpen,
  isCollapsed,
  onToggle,
  onRefresh,
}: Props) {
  return (
    <header class="navbar w-full rounded-box bg-base-100 justify-between">
      <div class="flex flex-row items-center">
        <button
          type="button"
          aria-label={
            !isReady
              ? '切换侧边栏'
              : !isDesktop
                  ? isAsideOpen
                    ? '关闭侧边栏'
                    : '打开侧边栏'
                  : isCollapsed
                    ? '展开侧边栏'
                    : '折叠侧边栏'
          }
          class="btn btn-ghost btn-link transition-all transition-discrete"
          onClick={onToggle}
        >
          <span
            class={`transition-all transition-discrete ${!isReady ? 'rotate-0 icon-[ri--menu-line]' : !isDesktop ? (isAsideOpen ? 'rotate-90 icon-[ri--close-line]' : 'rotate-0 icon-[ri--menu-line]') : isCollapsed ? 'scale-90 icon-[ri--menu-fold-2-line]' : 'scale-100 icon-[ri--menu-fold-line]'}`}
          >
          </span>
        </button>
        <div>Navbar Title</div>
      </div>
      <ul class="menu menu-sm menu-horizontal p-0 items-center">
        <li class="bg-transparent!">
          <button
            class="btn btn-ghost btn-link opacity-80"
            aria-label="刷新当前页面"
            onClick={onRefresh}
          >
            <i class="icon-[ri--loop-right-line]"></i>
          </button>
        </li>
        <li>
          <details>
            {/* class={showDesktopUI ? "" : "after:hidden"} */}
            <summary class="after:hidden lg:after:block">
              <div role="button" class="flex row items-center gap-2">
                <div class="avatar">
                  <div class="w-8 rounded-full">
                    <img
                      alt="用户头像"
                      src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                    />
                  </div>
                </div>
                <div class="text-sm hidden lg:block">111</div>
              </div>
            </summary>
            <ul class="bg-base-100 rounded p-2 mt-2 w-32 right-0">
              <li>
                <a>个人中心</a>
              </li>
              <li>
                <a>退出登录</a>
              </li>
            </ul>
          </details>
        </li>
      </ul>
    </header>
  )
}
