import type {
  MenuBreadcrumbItem,
  MenuItem,
} from '../../../../../service/admin/system/menu/consts'
import type {
  UserHeaderProfile,
} from '../../../../../service/admin/system/user/dto'
import {
  getMenuBreadcrumbs,
} from '../../../../../service/admin/system/menu'
import { userMenus } from '../../../../../service/admin/system/menu/consts'
import HeaderActions, { hasAdminMenuHref } from './header-actions'

interface Props {
  currentMenuName: string
  flush?: boolean
  menus: MenuItem[]
  user: UserHeaderProfile | null
}

export default function Header({
  currentMenuName,
  flush = false,
  menus,
  user,
}: Props) {
  const breadcrumbs = getMenuBreadcrumbs(currentMenuName, [
    ...menus,
    ...userMenus,
  ])
  const headerClass = flush
    ? 'navbar w-full bg-base-100 justify-between border-b border-base-200'
    : 'navbar w-full rounded-box bg-base-100 justify-between'

  return (
    <header
      class={headerClass}
      data-controller={`dropdown${hasAdminMenuHref(menus) ? ' update-status' : ''}`}
    >
      <div class="flex min-w-0 flex-row ">
        <button
          type="button"
          aria-label="折叠侧边栏"
          class="inline-flex items-center justify-center rounded-full p-2 transition-colors hover:bg-base-200/50 mr-1"
          data-action="layout#toggle"
          data-layout-target="headerToggle"
        >
          <span
            class="scale-100 transition-transform duration-150 ease-out text-sm icon-[ri--menu-fold-line] "
            aria-hidden="true"
            data-layout-target="headerToggleIcon"
          >
          </span>
        </button>
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <HeaderActions menus={menus} user={user} />
      </div>
    </header>
  )
}

function Breadcrumbs({ items }: { items: MenuBreadcrumbItem[] }) {
  if (!items.length) {
    return null
  }

  return (
    <nav
      class="breadcrumbs min-w-0 overflow-hidden text-sm opacity-80"
      aria-label="面包屑导航"
    >
      <ul class="min-w-0 flex-nowrap">
        {items.map((item, index) => (
          <li key={item.name} class="min-w-0 text-xs">
            {renderBreadcrumbItem(item, index === items.length - 1)}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function renderBreadcrumbItem(item: MenuBreadcrumbItem, isLastItem: boolean) {
  const className = 'min-w-0 truncate '

  if (!item.href || isLastItem) {
    return <span class={className}>{item.label}</span>
  }

  return (
    <a class={className} href={item.href}>
      {item.label}
    </a>
  )
}
