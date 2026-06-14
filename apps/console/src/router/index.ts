import { adminMenus, userMenus } from '@hono-admin/server/api/schema'
import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/layout/AppLayout.vue'
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

function resolveView(path: string) {
  const component = viewModules[path]
  if (!component) {
    throw new Error(`视图不存在:${path}`)
  }

  return component
}
