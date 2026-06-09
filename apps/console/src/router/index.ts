import { adminMenus, userMenus } from '@hono-admin/server/service/admin/system/menu/consts'
import { createRouter, createWebHistory } from 'vue-router'
import { createMenuRouteRecords } from './menu-routes'

const viewModules = import.meta.glob('../views/**/*.vue')
const installView = resolveView('../views/install.vue')
const loginView = resolveView('../views/login.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/admin/dashboard' },
    { component: installView, meta: { public: true }, path: '/install' },
    { path: '/admin', redirect: '/admin/dashboard' },
    { component: loginView, meta: { public: true }, path: '/admin/login' },
    ...createMenuRouteRecords(adminMenus, viewModules),
    { path: '/user', redirect: '/user/dashboard' },
    { component: loginView, meta: { public: true }, path: '/user/login' },
    ...createMenuRouteRecords(userMenus, viewModules),
    { path: '/:pathMatch(.*)*', redirect: '/admin/dashboard' },
  ],
})

function resolveView(path: string) {
  const component = viewModules[path]
  if (!component) {
    throw new Error(`视图不存在：${path}`)
  }

  return component
}
