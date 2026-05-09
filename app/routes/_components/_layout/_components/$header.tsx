import type {
  MenuBreadcrumbItem,
  MenuItem,
} from '../../../../service/admin/system/menu/consts'
import type {
  UserHeaderProfile,
  UserSessionRole,
} from '../../../../service/admin/system/user/dto'
import { useEffect, useState } from 'hono/jsx'
import {
  getMenuBreadcrumbs,
} from '../../../../service/admin/system/menu'
import { userMenus } from '../../../../service/admin/system/menu/consts'
import { getAvatarText } from '../../../../utils/avatar'

interface Props {
  currentMenuName: string
  isDesktop: boolean
  isAsideOpen: boolean
  isCollapsed: boolean
  menus: MenuItem[]
  onToggle: () => void
  onRefresh: () => void
  user?: UserHeaderProfile | null
}

export default function Header({
  currentMenuName,
  isDesktop,
  isAsideOpen,
  isCollapsed,
  menus,
  onToggle,
  onRefresh,
  user = null,
}: Props) {
  const asideToggleIconClass = getAsideToggleIconClass({
    isAsideOpen,
    isCollapsed,
    isDesktop,
  })
  const breadcrumbs = getMenuBreadcrumbs(currentMenuName, [
    ...menus,
    ...userMenus,
  ])
  const [updateStatus, setUpdateStatus] = useState<{
    pendingMigrationCount: number
  }>({ pendingMigrationCount: 0 })
  const canSwitchRole = (user?.roles.length ?? 0) > 1
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  useEffect(() => {
    if (!hasAdminMenuHref(menus)) {
      return
    }

    let disposed = false

    fetch('/admin/system/update/status', {
      headers: {
        Accept: 'application/json',
      },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: unknown) => {
        const updateResult = result as {
          data?: {
            migration?: { pendingCount?: unknown }
          }
          ok?: unknown
        } | null

        if (!disposed && updateResult?.ok === true) {
          setUpdateStatus({
            pendingMigrationCount:
              typeof updateResult.data?.migration?.pendingCount === 'number'
                ? updateResult.data.migration.pendingCount
                : 0,
          })
        }
      })
      .catch(() => {})

    return () => {
      disposed = true
    }
  }, [menus])

  useEffect(() => {
    if (!isRoleMenuOpen && !isUserMenuOpen) {
      return
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      if (
        target.closest('[data-header-role-menu="true"]')
        || target.closest('[data-header-user-menu="true"]')
      ) {
        return
      }

      setIsRoleMenuOpen(false)
      setIsUserMenuOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRoleMenuOpen(false)
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isRoleMenuOpen, isUserMenuOpen])

  return (
    <header class="navbar w-full rounded-box bg-base-100 justify-between">
      <div class="flex min-w-0 flex-row items-center">
        <button
          type="button"
          aria-label={
            !isDesktop
              ? isAsideOpen
                ? '关闭侧边栏'
                : '打开侧边栏'
              : isCollapsed
                ? '展开侧边栏'
                : '折叠侧边栏'
          }
          class="btn btn-ghost btn-link"
          onClick={onToggle}
        >
          <span class={asideToggleIconClass} aria-hidden="true"></span>
        </button>
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          class="btn btn-ghost btn-circle opacity-80"
          aria-label="刷新当前页面"
          type="button"
          onClick={onRefresh}
        >
          <i class="icon-[ri--loop-right-line]"></i>
        </button>
        {canSwitchRole && user
          ? (
              <RoleSwitchDropdown
                activeRoleId={user.activeRoleId}
                isOpen={isRoleMenuOpen}
                roles={user.roles}
                onToggle={() => {
                  setIsRoleMenuOpen((open) => !open)
                  setIsUserMenuOpen(false)
                }}
              />
            )
          : null}
        {updateStatus.pendingMigrationCount > 0
          ? (
              <a
                aria-label="数据库需要迁移"
                class="btn btn-circle btn-ghost btn-sm text-warning"
                href="/admin/system/update"
                title={`待执行 ${updateStatus.pendingMigrationCount} 个数据库迁移`}
              >
                <i class="icon-[ri--database-2-line]" />
              </a>
            )
          : null}
        <div class="relative" data-header-user-menu="true">
          <button
            aria-expanded={isUserMenuOpen ? 'true' : 'false'}
            aria-haspopup="menu"
            class="btn btn-ghost gap-2 px-2"
            type="button"
            onClick={() => {
              setIsUserMenuOpen((open) => !open)
              setIsRoleMenuOpen(false)
            }}
          >
            <HeaderUserAvatar user={user} />
            <div class="text-sm hidden max-w-28 truncate lg:block">
              {getHeaderUserName(user)}
            </div>
            <i class="hidden lg:inline-block icon-[ri--arrow-down-s-line]" />
          </button>
          {isUserMenuOpen
            ? (
                <ul
                  class="menu absolute right-0 top-full z-50 mt-3 w-52 rounded-box bg-base-100 p-2 shadow flex gap-y-1"
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
                      <button
                        class="flex w-full items-center rounded-field px-3 py-2 text-left hover:bg-base-200"
                        type="submit"
                      >
                        退出登录
                      </button>
                    </form>
                  </li>
                </ul>
              )
            : null}
        </div>
      </div>
    </header>
  )
}

function RoleSwitchDropdown({
  activeRoleId,
  isOpen,
  onToggle,
  roles,
}: {
  activeRoleId: number | null
  isOpen: boolean
  onToggle: () => void
  roles: UserSessionRole[]
}) {
  const activeRole = roles.find((role) => role.id === activeRoleId)

  return (
    <div class="relative" data-header-role-menu="true">
      <button
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="menu"
        aria-label={`切换角色${activeRole ? `，当前为${activeRole.name}` : ''}`}
        class="btn btn-ghost btn-circle opacity-80"
        title={activeRole ? `当前角色：${activeRole.name}` : '切换角色'}
        type="button"
        onClick={onToggle}
      >
        <i class="icon-[ri--shield-user-line]" aria-hidden="true" />
      </button>
      {isOpen
        ? (
            <ul
              class="menu absolute right-0 top-full z-50 mt-3 w-44 rounded-box bg-base-100 p-2 shadow flex gap-y-1"
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
          )
        : null}
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
      >
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
  if (user?.avatar) {
    return (
      <div class="avatar">
        <div class="h-8 w-8 rounded-full bg-primary/80">
          <img alt={`${getHeaderUserName(user)}头像`} src={user.avatar} />
        </div>
      </div>
    )
  }

  return (
    <div class="avatar placeholder">
      <div class="h-8 w-8 rounded-full bg-primary/80 text-white leading-8">
        <span class="text-sm font-semibold">{getAvatarText(user)}</span>
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

function getAsideToggleIconClass({
  isDesktop,
  isAsideOpen,
  isCollapsed,
}: Pick<Props, 'isAsideOpen' | 'isCollapsed' | 'isDesktop'>) {
  if (!isDesktop) {
    return isAsideOpen
      ? 'rotate-90 transition-transform duration-150 ease-out icon-[ri--close-line]'
      : 'rotate-0 transition-transform duration-150 ease-out icon-[ri--menu-line]'
  }

  return isCollapsed
    ? 'scale-95 transition-transform duration-150 ease-out icon-[ri--menu-fold-2-line]'
    : 'scale-100 transition-transform duration-150 ease-out icon-[ri--menu-fold-line]'
}
