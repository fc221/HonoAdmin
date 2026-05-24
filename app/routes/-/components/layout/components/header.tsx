import type {
  MenuBreadcrumbItem,
  MenuItem,
} from '../../../../../service/admin/system/menu/consts'
import type {
  UserHeaderProfile,
  UserSessionRole,
} from '../../../../../service/admin/system/user/dto'
import {
  getMenuBreadcrumbs,
} from '../../../../../service/admin/system/menu'
import { userMenus } from '../../../../../service/admin/system/menu/consts'
import { getAvatarText } from '../../../../../utils/avatar'
import LazyAvatarImage from '../../../components/lazy-avatar-image'
import CsrfField from '../../csrf-field'
import { topLevelFormTurboAttrs } from '../../turbo-frame'

interface Props {
  currentMenuName: string
  menus: MenuItem[]
  user: UserHeaderProfile | null
}

export default function Header({
  currentMenuName,
  menus,
  user,
}: Props) {
  const breadcrumbs = getMenuBreadcrumbs(currentMenuName, [
    ...menus,
    ...userMenus,
  ])
  const canSwitchRole = (user?.roles.length ?? 0) > 1

  return (
    <header
      class="navbar w-full rounded-box bg-base-100 justify-between"
      data-controller={`dropdown${hasAdminMenuHref(menus) ? ' update-status' : ''}`}
    >
      <div class="flex min-w-0 flex-row items-center">
        <button
          type="button"
          aria-label="折叠侧边栏"
          class="btn btn-ghost btn-link"
          data-action="layout#toggle"
          data-layout-target="headerToggle"
        >
          <span
            class="scale-100 transition-transform duration-150 ease-out icon-[ri--menu-fold-line]"
            aria-hidden="true"
            data-layout-target="headerToggleIcon"
          >
          </span>
        </button>
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          class="btn btn-ghost btn-circle opacity-80"
          aria-label="刷新当前页面"
          type="button"
          data-action="layout#refresh"
        >
          <i class="icon-[ri--loop-right-line]"></i>
        </button>
        {canSwitchRole && user
          ? (
              <RoleSwitchDropdown
                activeRoleId={user.activeRoleId}
                roles={user.roles}
              />
            )
          : null}
        {hasAdminMenuHref(menus)
          ? (
              <a
                aria-label="数据库需要迁移"
                class="btn btn-circle btn-ghost btn-sm text-warning"
                data-update-status-target="link"
                hidden
                href="/admin/system/update"
                title=""
              >
                <i class="icon-[ri--database-2-line]" />
              </a>
            )
          : null}
        <div class="relative" data-header-user-menu="true">
          <button
            aria-expanded="false"
            aria-haspopup="menu"
            class="btn btn-ghost gap-2 px-2"
            data-action="dropdown#toggle"
            data-dropdown-key="user"
            data-dropdown-target="button"
            type="button"
          >
            <HeaderUserAvatar user={user} />
            <div class="text-sm hidden max-w-28 truncate lg:block">
              {getHeaderUserName(user)}
            </div>
            <i class="hidden lg:inline-block icon-[ri--arrow-down-s-line]" />
          </button>
          <ul
            class="menu absolute right-0 top-full z-50 mt-3 w-52 rounded-box bg-base-100 p-2 shadow flex gap-y-1"
            data-dropdown-key="user"
            data-dropdown-target="menu"
            hidden
            role="menu"
          >
            <li>
              <a href="/user/profile" role="menuitem">
                个人中心
              </a>
            </li>
            <li class="w-full">
              <form
                action="/user/logout"
                class="contents"
                method="post"
              >
                <CsrfField />
                <button
                  class="flex w-full items-center rounded-field px-3 py-2 text-left hover:bg-base-200"
                  type="submit"
                >
                  退出登录
                </button>
              </form>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}

function RoleSwitchDropdown({
  activeRoleId,
  roles,
}: {
  activeRoleId: number | null
  roles: UserSessionRole[]
}) {
  const activeRole = roles.find((role) => role.id === activeRoleId)

  return (
    <div class="relative" data-header-role-menu="true">
      <button
        aria-expanded="false"
        aria-haspopup="menu"
        aria-label={`切换角色${activeRole ? `，当前为${activeRole.name}` : ''}`}
        class="btn btn-ghost btn-circle opacity-80"
        data-action="dropdown#toggle"
        data-dropdown-key="role"
        data-dropdown-target="button"
        title={activeRole ? `当前角色：${activeRole.name}` : '切换角色'}
        type="button"
      >
        <i class="icon-[ri--shield-user-line]" aria-hidden="true" />
      </button>
      <ul
        class="menu absolute right-0 top-full z-50 mt-3 w-44 rounded-box bg-base-100 p-2 shadow flex gap-y-1"
        data-dropdown-key="role"
        data-dropdown-target="menu"
        hidden
        role="menu"
      >
        <li class="menu-title px-3">
          <span>角色切换</span>
        </li>
        {roles.map((role) => (
          <RoleSwitchMenuItem
            active={activeRoleId === role.id}
            key={role.id}
            role={role}
          />
        ))}
      </ul>
    </div>
  )
}

function RoleSwitchMenuItem({
  active,
  role,
}: {
  active: boolean
  role: UserSessionRole
}) {
  return (
    <li class="w-full">
      <form
        action="/user/role-switch"
        class="contents"
        method="post"
        {...topLevelFormTurboAttrs}
      >
        <CsrfField />
        <input name="roleId" type="hidden" value={role.id} />
        <button
          class="flex w-full items-center justify-between rounded-field px-3 py-2 text-left hover:bg-base-200 disabled:cursor-default disabled:opacity-60"
          disabled={active}
          type="submit"
        >
          <span>{role.name}</span>
          {active
            ? <i class="icon-[ri--check-line]" aria-hidden="true" />
            : null}
        </button>
      </form>
    </li>
  )
}

function hasAdminMenuHref(items: MenuItem[]): boolean {
  return items.some((item) =>
    item.href?.startsWith('/admin') || hasAdminMenuHref(item.children ?? [])
  )
}

function HeaderUserAvatar({ user }: { user: UserHeaderProfile | null }) {
  return (
    <div class="avatar">
      <div class="relative h-8 w-8 overflow-hidden rounded-full bg-primary/80 text-white leading-8">
        <LazyAvatarImage
          alt={`${getHeaderUserName(user)}头像`}
          fallbackText={getAvatarText(user)}
          src={user?.avatar}
        />
      </div>
    </div>
  )
}

function getHeaderUserName(user: UserHeaderProfile | null): string {
  return user?.nickname || user?.username || '用户'
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
          <li key={item.name} class="min-w-0">
            {renderBreadcrumbItem(item, index === items.length - 1)}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function renderBreadcrumbItem(item: MenuBreadcrumbItem, isLastItem: boolean) {
  const className = 'min-w-0 truncate'

  if (!item.href || isLastItem) {
    return <span class={className}>{item.label}</span>
  }

  return (
    <a class={className} href={item.href}>
      {item.label}
    </a>
  )
}
