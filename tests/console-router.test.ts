import { describe, expect, test } from 'bun:test'
import {
  createMenuRouteRecords,
  resolveResourceName,
} from '../apps/console/src/router/menu-routes'
import { adminMenus, userMenus } from '../apps/server/src/service/admin/system/menu/consts'

const viewModules = Object.fromEntries(
  [
    'admin/dashboard',
    'admin/system/config',
    'admin/system/cron',
    'admin/system/file',
    'admin/system/update',
    'admin/system/user',
    'user/dashboard',
    'user/profile',
  ].map((component) => [`../views/${component}.vue`, async () => ({ default: {} })]),
)

const fallbackView = async () => ({ default: {} })

describe('console menu routes', () => {
  test('builds Vue routes from server menu component paths', () => {
    const routes = createMenuRouteRecords([...adminMenus, ...userMenus], viewModules, fallbackView)
    const routeByPath = new Map(routes.map((route) => [route.path, route]))

    expect(routeByPath.get('/admin/system/user')?.meta).toMatchObject({
      activeMenuName: 'admin.system.user',
      resource: 'system-user',
      title: '用户管理',
    })
    expect(routeByPath.get('/admin/web/page')?.meta).toMatchObject({
      activeMenuName: 'admin.web.page',
      resource: 'web-page',
      title: '页面管理',
    })
    expect(routeByPath.get('/user/profile')?.meta).toMatchObject({
      activeMenuName: 'user.profile',
      resource: 'profile',
      title: '个人中心',
    })
    // 未声明 component 的菜单项落到兜底视图(通用 ResourcePage)。
    expect(routeByPath.get('/admin/web/feedback')?.component).toBe(fallbackView)
    // 声明了 component 的菜单项仍走 viewModules 解析,不吃兜底。
    expect(routeByPath.get('/admin/system/user')?.component).toBe(viewModules['../views/admin/system/user.vue'])
  })

  test('drops menu items without component when no fallback is given', () => {
    const routes = createMenuRouteRecords(adminMenus, viewModules)
    const paths = routes.map((route) => route.path)

    expect(paths).not.toContain('/admin/web/feedback')
    expect(paths).toContain('/admin/system/user')
  })

  test('normalizes menu names to resource names', () => {
    expect(resolveResourceName('admin.system.operate-log')).toBe('system-operate-log')
    expect(resolveResourceName('admin.web.feedback')).toBe('web-feedback')
    expect(resolveResourceName('user.profile')).toBe('profile')
  })
})
