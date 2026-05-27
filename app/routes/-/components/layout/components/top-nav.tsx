import type { MenuItem } from '../../../../../service/admin/system/menu/consts'
import type {
  UserHeaderProfile,
} from '../../../../../service/admin/system/user/dto'
import {
  isMenuItemActive,
} from '../../../../../service/admin/system/menu'
import { getSiteLogoText } from '../../../utils/branding'
import HeaderActions, { hasAdminMenuHref } from './header-actions'

interface Props {
  currentMenuName: string
  flush?: boolean
  rootOnly?: boolean
  menus: MenuItem[]
  siteTitle: string
  user: UserHeaderProfile | null
}

export default function TopNav({
  currentMenuName,
  flush = false,
  rootOnly = false,
  menus,
  siteTitle,
  user,
}: Props) {
  const navClass = flush
    ? 'navbar relative w-full bg-base-100 border-b border-base-200 px-4 gap-3'
    : 'navbar relative w-full bg-base-100 rounded-box gap-3'

  return (
    <header
      class={navClass}
      data-layout-top-nav-bar
      data-controller={`dropdown${hasAdminMenuHref(menus) ? ' update-status' : ''}`}
    >
      <div class="flex w-full min-w-0 items-center gap-3" data-layout-top-nav-content>
        <div class="flex min-w-0 items-center gap-3" data-layout-top-nav-brand>
          <Logo siteTitle={siteTitle} />
        </div>
        <nav class="ml-2 flex flex-1 min-w-0" aria-label="主导航" data-layout-top-menu>
          <TopMenu
            currentMenuName={currentMenuName}
            items={menus}
            rootOnly={rootOnly}
          />
        </nav>
        <div class="ml-auto flex shrink-0 items-center gap-1" data-layout-top-nav-actions>
          <HeaderActions menus={menus} user={user} />
        </div>
      </div>
    </header>
  )
}

function Logo({ siteTitle }: { siteTitle: string }) {
  return (
    <a
      class="flex items-center gap-2 px-2"
      href="/"
      aria-label={siteTitle}
    >
      <div class="bg-linear-to-br from-primary to-primary/30 rounded-box flex h-9 w-9 items-center justify-center">
        <span class="text-white text-sm font-bold">{getSiteLogoText(siteTitle)}</span>
      </div>
      <span class="text-base font-semibold">{siteTitle}</span>
    </a>
  )
}

function TopMenu({
  currentMenuName,
  items,
  rootOnly,
}: {
  currentMenuName: string
  items: MenuItem[]
  rootOnly: boolean
}) {
  return (
    <ul class="menu menu-horizontal min-w-0 flex-nowrap items-center gap-1 overflow-x-auto p-0">
      {items.map((item) => (
        <TopMenuItem
          currentMenuName={currentMenuName}
          item={item}
          key={item.name}
          rootOnly={rootOnly}
        />
      ))}
    </ul>
  )
}

function TopMenuItem({
  currentMenuName,
  item,
  rootOnly,
}: {
  currentMenuName: string
  item: MenuItem
  rootOnly: boolean
}) {
  const active = isMenuItemActive(item, currentMenuName)
  const activeClass = active ? 'menu-active' : ''

  if (rootOnly) {
    const href = item.href ?? getFirstMenuHref(item)
    if (!href) {
      return null
    }

    return (
      <li class="min-w-0">
        <a
          class={`${activeClass} gap-2`}
          href={href}
          title={item.label}
        >
          <i class={`${item.icon} shrink-0`}></i>
          <span class="min-w-0 truncate">{item.label}</span>
        </a>
      </li>
    )
  }

  if (item.children?.length) {
    const popoverId = getTopMenuPopoverId(item.name)
    const anchorName = `--${popoverId}`

    return (
      <li class="min-w-0">
        <button
          aria-label={item.label}
          class={`${activeClass} gap-2`}
          popovertarget={popoverId}
          style={`anchor-name:${anchorName}`}
          title={item.label}
          type="button"
        >
          <i class={`${item.icon} shrink-0`}></i>
          <span class="min-w-0 truncate">{item.label}</span>
          <i class="icon-[ri--arrow-down-s-line]" aria-hidden="true"></i>
        </button>
        <ul
          id={popoverId}
          popover="auto"
          style={`position-anchor:${anchorName}`}
          class="dropdown menu w-56 max-w-[calc(100vw-2rem)] rounded-box bg-base-100 p-2 shadow space-y-1"
        >
          {item.children.map((child) => (
            <TopSubMenuItem
              currentMenuName={currentMenuName}
              item={child}
              key={child.name}
            />
          ))}
        </ul>
      </li>
    )
  }

  if (!item.href) {
    return null
  }

  return (
    <li class="min-w-0">
      <a
        class={`${activeClass} gap-2`}
        href={item.href}
        title={item.label}
      >
        <i class={`${item.icon} shrink-0`}></i>
        <span class="min-w-0 truncate">{item.label}</span>
      </a>
    </li>
  )
}

function TopSubMenuItem({
  currentMenuName,
  item,
}: {
  currentMenuName: string
  item: MenuItem
}) {
  const active = isMenuItemActive(item, currentMenuName)
  const activeClass = active ? 'menu-active' : ''

  if (item.children?.length) {
    return (
      <li class="min-w-0">
        <details open={active}>
          <summary class={`${activeClass} min-w-0 gap-2`}>
            <i class={`${item.icon} shrink-0`}></i>
            <span class="min-w-0 truncate">{item.label}</span>
          </summary>
          <ul class="mt-1 min-w-0 space-y-1">
            {item.children.map((child) => (
              <TopSubMenuItem
                currentMenuName={currentMenuName}
                item={child}
                key={child.name}
              />
            ))}
          </ul>
        </details>
      </li>
    )
  }

  if (!item.href) {
    return null
  }

  return (
    <li class="min-w-0">
      <a class={`${activeClass} min-w-0 gap-2`} href={item.href}>
        <i class={`${item.icon} shrink-0`}></i>
        <span class="min-w-0 truncate">{item.label}</span>
      </a>
    </li>
  )
}

function getTopMenuPopoverId(name: string) {
  return `top-menu-${name.split('.').join('-')}`
}

function getFirstMenuHref(item: MenuItem): string | undefined {
  if (item.href) {
    return item.href
  }

  for (const child of item.children ?? []) {
    const href = getFirstMenuHref(child)
    if (href) {
      return href
    }
  }
}
