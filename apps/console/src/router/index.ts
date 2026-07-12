import { adminMenus, userMenus } from '@hono-admin/server/api/menu'
import { createRouter, createWebHistory } from 'vue-router'
import { apiClient, ApiClientError } from '../api/client'
import AppLayout from '../components/layout/AppLayout.vue'
import { useSessionStore } from '../stores/session'
import { createMenuRouteRecords } from './menu-routes'

const viewModules = import.meta.glob('../views/**/*.vue')
const installView = resolveView('../views/install.vue')
const loginView = resolveView('../views/login.vue')
const notFoundView = resolveView('../views/not-found.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/admin/dashboard' },
    { component: installView, path: '/install' },
    { component: loginView, path: '/admin/login' },
    { component: loginView, path: '/user/login' },
    {
      children: [
        { path: '', redirect: '/admin/dashboard' },
        ...createMenuRouteRecords(adminMenus, viewModules),
        { component: notFoundView, path: ':pathMatch(.*)*' },
      ],
      component: AppLayout,
      path: '/admin',
    },
    {
      children: [
        { path: '', redirect: '/user/dashboard' },
        ...createMenuRouteRecords(userMenus, viewModules),
        { component: notFoundView, path: ':pathMatch(.*)*' },
      ],
      component: AppLayout,
      path: '/user',
    },
    { component: notFoundView, path: '/:pathMatch(.*)*' },
  ],
})

// 进入控制台前先确认会话:未登录/未安装在导航阶段就拦下,避免 AppLayout 先渲染再跳转造成闪屏。
// 布局有缓存,登录后的后续导航直接命中缓存,不会重复请求。
router.beforeEach(async (to) => {
  const surface = to.path.startsWith('/admin/')
    ? 'admin'
    : to.path.startsWith('/user/') ? 'user' : null
  if (!surface || to.path === '/admin/login' || to.path === '/user/login') {
    return true
  }

  try {
    await useSessionStore().ensureLayout(surface)
    return true
  } catch (reason) {
    if (reason instanceof ApiClientError && reason.status === 401) {
      return { path: `/${surface}/login`, query: { returnTo: to.fullPath } }
    }
    if (reason instanceof ApiClientError && reason.status === 428) {
      const status = await apiClient.installStatus().catch(() => null)
      return status?.installed ? '/admin/system/update' : '/install'
    }

    // ponytail: 其他错误(如 5xx)放行,交给 AppLayout 现有的加载失败提示。
    return true
  }
})

function resolveView(path: string) {
  const component = viewModules[path]
  if (!component) {
    throw new Error(`视图不存在:${path}`)
  }

  return component
}
