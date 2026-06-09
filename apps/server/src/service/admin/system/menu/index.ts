import type { MenuBreadcrumbItem, MenuItem } from './consts'
import { defaultMenus } from './consts'

export function getMenuBreadcrumbs(
  currentMenuName: string,
  items: MenuItem[] = defaultMenus,
): MenuBreadcrumbItem[] {
  const activePath = getActiveMenuPath(items, currentMenuName)

  return (activePath ?? []).map((item) => ({
    href: item.href,
    label: item.label,
    name: item.name,
  }))
}

export function getActiveMenuPath(
  items: MenuItem[],
  currentMenuName: string,
  parents: MenuItem[] = [],
): MenuItem[] | undefined {
  for (const item of items) {
    const currentMenuPath = [...parents, item]

    if (item.children?.length) {
      const activeChildPath = getActiveMenuPath(
        item.children,
        currentMenuName,
        currentMenuPath,
      )

      if (activeChildPath) {
        return activeChildPath
      }
    }

    if (item.name === currentMenuName) {
      return currentMenuPath
    }
  }
}

export function isMenuItemOpen(
  item: MenuItem,
  currentMenuName: string,
): boolean {
  return !!item.defaultOpen || isMenuItemActive(item, currentMenuName)
}

export function isMenuItemActive(
  item: MenuItem,
  currentMenuName: string,
): boolean {
  if (item.name === currentMenuName) {
    return true
  }

  return !!item.children?.some((child) =>
    isMenuItemActive(child, currentMenuName)
  )
}
