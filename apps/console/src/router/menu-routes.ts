import type { MenuItem } from '@hono-admin/server/api/schema'
import type { RouteComponent, RouteRecordRaw } from 'vue-router'

export type ConsoleViewLoader = () => Promise<unknown>

export function createMenuRouteRecords(
  menus: MenuItem[],
  viewModules: Record<string, ConsoleViewLoader>,
  fallback?: ConsoleViewLoader,
): RouteRecordRaw[] {
  return flattenMenuItems(menus)
    .filter((item) => item.routePath && (item.component || fallback))
    .map((item) => ({
      // 菜单项未指定 component 时落到通用兜底视图(ResourcePage)。
      component: item.component ? resolveViewComponent(item, viewModules) : fallback as RouteComponent,
      meta: {
        activeMenuName: item.name,
        resource: resolveResourceName(item.name),
        title: item.label,
      },
      path: item.routePath!,
    }))
}

export function resolveResourceName(menuName: string): string {
  if (menuName.startsWith('admin.')) {
    return menuName.slice('admin.'.length).replaceAll('.', '-')
  }

  if (menuName.startsWith('user.')) {
    return menuName.slice('user.'.length).replaceAll('.', '-')
  }

  return menuName.replaceAll('.', '-')
}

function flattenMenuItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => [
    item,
    ...flattenMenuItems(item.children ?? []),
  ])
}

function resolveViewComponent(
  item: MenuItem,
  viewModules: Record<string, ConsoleViewLoader>,
): RouteComponent {
  const viewPath = `../views/${item.component}.vue`
  const component = viewModules[viewPath]

  if (!component) {
    throw new Error(`菜单 ${item.name} 指向的视图不存在：${viewPath}`)
  }

  return component as RouteComponent
}
