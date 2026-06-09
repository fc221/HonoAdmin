import type { MenuItem } from '@hono-admin/server/api/schema'
import type { MenuOption } from 'naive-ui'
import { h } from 'vue'
import AppIcon from '../AppIcon.vue'

export interface BreadcrumbItem {
  href?: string
  label: string
  name: string
}

export function createMenuOptions(items: MenuItem[]): MenuOption[] {
  return items.map(toMenuOption)
}

export function createRootMenuOptions(items: MenuItem[]): MenuOption[] {
  return items
    .map((item) => {
      const href = getFirstMenuHref(item)
      if (!href) {
        return null
      }

      return toMenuOption({ ...item, children: undefined, href })
    })
    .filter((option): option is MenuOption => option !== null)
}

export function getActivePath(
  items: MenuItem[],
  currentName: string,
  parents: MenuItem[] = [],
): MenuItem[] | null {
  for (const item of items) {
    const path = [...parents, item]
    if (item.name === currentName) {
      return path
    }

    const childPath = item.children?.length
      ? getActivePath(item.children, currentName, path)
      : null
    if (childPath) {
      return childPath
    }
  }

  return null
}

export function getExpandedMenuKeys(
  items: MenuItem[],
  currentName: string,
  activePath: MenuItem[],
): Array<string | number> {
  const keys = new Set<string | number>()

  for (const item of items) {
    if (item.defaultOpen || item.children?.some((child) => child.name === currentName)) {
      keys.add(item.name)
    }
    for (const child of item.children ?? []) {
      if (child.children?.some((grandchild) => grandchild.name === currentName)) {
        keys.add(item.name)
        keys.add(child.name)
      }
    }
  }

  for (const item of activePath.slice(0, -1)) {
    keys.add(item.name)
  }

  return [...keys]
}

export function getExpandableMenuKeys(items: MenuItem[]): Array<string | number> {
  const keys: Array<string | number> = []

  for (const item of items) {
    if (item.children?.length) {
      keys.push(item.name)
      keys.push(...getExpandableMenuKeys(item.children))
    }
  }

  return keys
}

export function getFirstMenuHref(item: MenuItem): string | undefined {
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

export function getLogoText(siteTitle: string): string {
  const normalized = siteTitle.trim()
  if (!normalized)
    return 'HA'
  const capitalLetters = normalized.match(/[A-Z]/g)
  if (capitalLetters && capitalLetters.length >= 2) {
    return capitalLetters.slice(0, 2).join('')
  }
  const ascii = normalized.match(/[A-Z0-9]/gi)?.slice(0, 2).join('')
  return (ascii || normalized.slice(0, 2)).toUpperCase()
}

export function findMenuHref(options: MenuOption[], key: string | number): string {
  for (const option of options) {
    if (option.key === key && typeof option.href === 'string') {
      return option.href
    }

    const href = findMenuHref((option.children ?? []) as MenuOption[], key)
    if (href) {
      return href
    }
  }

  return ''
}

export function renderThemeIcon(value: string) {
  return () => h(AppIcon, { name: value })
}

function toMenuOption(item: MenuItem): MenuOption {
  return {
    children: item.children?.map(toMenuOption),
    href: item.href,
    icon: renderMenuIcon(item.icon),
    key: item.name,
    label: item.label,
  }
}

function renderMenuIcon(iconClass: string) {
  return () => h(AppIcon, { class: 'text-base', name: iconClass })
}
