<script setup lang="ts">
import { ApiClientError } from '@hono-admin/server/api/client'
import { useLoadingBar, useNotification, useThemeVars } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from './components/layout/AppLayout.vue'
import { useSessionStore } from './stores/session'

const route = useRoute()
const router = useRouter()
const loadingBar = useLoadingBar()
const notification = useNotification()
const themeVars = useThemeVars()
const sessionStore = useSessionStore()
const { loading, menus, siteTitle, user } = storeToRefs(sessionStore)
const routeRefreshKey = ref(0)

const surface = computed(() => route.path.startsWith('/user') ? 'user' : 'admin')
const loginPath = computed(() => surface.value === 'user' ? '/user/login' : '/admin/login')
const isPublic = computed(() =>
  route.meta.public === true
  || route.path === '/admin/login'
  || route.path === '/user/login'
  || route.path === '/install'
  || isPublicPath(route.fullPath),
)
const activeMenuName = computed(() =>
  String(route.meta.activeMenuName ?? (surface.value === 'user' ? 'user.dashboard' : 'admin.dashboard')),
)
const section = computed(() => surface.value === 'user' ? '用户中心' : '管理后台')
const layoutLoadKey = computed(() => [
  isPublic.value ? 'public' : 'private',
  surface.value,
  activeMenuName.value,
].join(':'))
const routeViewKey = computed(() => `${route.path}:${routeRefreshKey.value}`)

watch(
  layoutLoadKey,
  async () => {
    if (isPublic.value)
      return

    const requestedPath = route.fullPath
    loadingBar.start()
    try {
      await sessionStore.loadLayout(surface.value, activeMenuName.value)
      loadingBar.finish()
    }
    catch (reason) {
      if (isPublic.value) {
        loadingBar.finish()
        return
      }

      if (reason instanceof ApiClientError && reason.status === 401) {
        loadingBar.finish()
        await router.replace(`${loginPath.value}?${new URLSearchParams({ returnTo: requestedPath })}`)
        return
      }
      if (reason instanceof ApiClientError && reason.status === 428) {
        loadingBar.finish()
        await router.replace('/install')
        return
      }

      loadingBar.error()
      notification.error({
        content: reason instanceof Error ? reason.message : '布局加载失败。',
        duration: 4500,
        title: '页面加载失败',
      })
    }
  },
  { immediate: true },
)

function isPublicPath(path: string) {
  return path.startsWith('/admin/login') || path.startsWith('/user/login') || path.startsWith('/install')
}

function navigate(href: string) {
  router.push(href)
}

function refreshCurrentRoute() {
  routeRefreshKey.value += 1
}

async function logout() {
  loadingBar.start()
  await sessionStore.logout()
  loadingBar.finish()
  await router.replace(loginPath.value)
}

async function switchRole(roleId: number) {
  loadingBar.start()
  try {
    const result = await sessionStore.switchRole(roleId)
    const target = typeof result.data?.target === 'string' ? result.data.target : ''
    loadingBar.finish()
    if (target) {
      await router.push(target)
      return
    }

    await sessionStore.loadLayout(surface.value, activeMenuName.value)
  }
  catch (reason) {
    loadingBar.error()
    notification.error({
      content: reason instanceof Error ? reason.message : '角色切换失败。',
      duration: 4500,
      title: '操作失败',
    })
  }
}
</script>

<template>
  <RouterView v-if="isPublic" />
  <AppLayout
    v-else
    :active-menu-name="activeMenuName"
    :menus="menus"
    :section="section"
    :site-title="siteTitle"
    :user="user"
    @logout="logout"
    @navigate="navigate"
    @refresh="refreshCurrentRoute"
    @role-switch="switchRole"
  >
    <div
      v-if="loading"
      class="border p-4 text-sm"
      :style="{
        background: themeVars.cardColor,
        borderColor: themeVars.borderColor,
        borderRadius: themeVars.borderRadius,
        color: themeVars.textColor3,
      }"
    >
      页面加载中...
    </div>
    <RouterView v-else :key="routeViewKey" />
  </AppLayout>
</template>
