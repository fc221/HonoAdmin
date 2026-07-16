<script setup lang="ts">
import { NLayout, NLayoutContent, NLayoutHeader } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLayoutStore } from '../../stores/layout'
import { useSessionStore } from '../../stores/session'
import AppHeader from './components/AppHeader.vue'
import AppMobileSidebar from './components/AppMobileSidebar.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppTopNav from './components/AppTopNav.vue'
import {
  isFlushVariant,
  isHybridVariant,
  isTopNavVariant,
} from './layout-config'
import { useLayoutMenus } from './layout-menus'
import { useSurfaceSession } from './surface-session'
import { useUserMenu } from './user-menu'

const route = useRoute()
const router = useRouter()
const layoutStore = useLayoutStore()
layoutStore.normalizeForConsole()
const { loading, siteTitle, user } = storeToRefs(useSessionStore())
const {
  mainWidth,
  sidebarCollapsed,
  sidebarStyle,
  topMenuCentered,
  variant,
} = storeToRefs(layoutStore)
const mobileOpen = ref(false)
const routeRefreshKey = ref(0)
const pendingActiveMenuName = ref<string | null>(null)
let routeNavigationId = 0

// surface(admin/user)由当前路由所在的布局父路由决定,不再靠 AppShell 透传。
const surface = computed<'admin' | 'user'>(() => route.path.startsWith('/user') ? 'user' : 'admin')
const loginPath = computed(() => surface.value === 'user' ? '/user/login' : '/admin/login')
const activeMenuName = computed(() =>
  String(route.meta.activeMenuName ?? (surface.value === 'user' ? 'user.dashboard' : 'admin.dashboard')),
)
const visibleActiveMenuName = computed(() => pendingActiveMenuName.value ?? activeMenuName.value)
const routeViewKey = computed(() => `${route.path}:${routeRefreshKey.value}`)

const flushLayout = computed(() => isFlushVariant(variant.value))
const hybridLayout = computed(() => isHybridVariant(variant.value))
const topNavLayout = computed(() => isTopNavVariant(variant.value))
const layoutHasSider = computed(() => !topNavLayout.value || mobileOpen.value)
const rootClass = computed(() =>
  flushLayout.value
    ? 'h-screen overflow-x-hidden'
    : 'h-screen overflow-x-hidden p-4',
)
const layoutVariantClass = computed(() => `ha-layout--${variant.value}`)
const sidebarOffsetClass = computed(() => {
  if (sidebarCollapsed.value) {
    return flushLayout.value ? 'lg:pl-20' : 'lg:pl-24'
  }

  return flushLayout.value ? 'lg:pl-64' : 'lg:pl-68'
})
const shellOffsetClass = computed(() =>
  !topNavLayout.value && !hybridLayout.value ? sidebarOffsetClass.value : '',
)
const contentOffsetClass = computed(() =>
  hybridLayout.value ? sidebarOffsetClass.value : '',
)
const contentWidthClass = computed(() =>
  topNavLayout.value && mainWidth.value === 'narrow'
    ? 'mx-auto w-full max-w-7xl'
    : 'w-full',
)
const desktopSidebarLogoVisible = computed(() => !hybridLayout.value)

const {
  breadcrumbs,
  logoText,
  menuExpandedKeys,
  mobileMenuOptions,
  sidebarMenuOptions,
  topMenuOptions,
  topSelectedMenuKey,
} = useLayoutMenus({ hybridLayout, visibleActiveMenuName })
const {
  selectedTheme,
  selectTheme,
  selectUserAction,
  themeDropdownOptions,
  userDropdownOptions,
  userLabel,
} = useUserMenu({ loginPath, navigate, refreshPage, surface })
const { layoutReady } = useSurfaceSession({ loginPath, surface })

function closeMobile() {
  mobileOpen.value = false
}

function navigate(href: string, activeKey?: string | number) {
  if (href === route.fullPath)
    return

  const navigationId = ++routeNavigationId
  pendingActiveMenuName.value = activeKey === undefined ? null : String(activeKey)
  void router.push(href).finally(() => {
    if (navigationId !== routeNavigationId)
      return
    pendingActiveMenuName.value = null
  })
}

function refreshPage() {
  routeRefreshKey.value += 1
}

function updateSidebarCollapsed(collapsed: boolean) {
  layoutStore.setSidebarCollapsed(collapsed)
}
</script>

<template>
  <NLayout
    :has-sider="layoutHasSider"
    class="ha-layout min-w-0 bg-base-100 text-base-content"
    content-class="h-full"
    :class="[rootClass, layoutVariantClass]"
    :native-scrollbar="false"
  >
    <AppSidebar
      v-if="!topNavLayout"
      v-model:expanded-keys="menuExpandedKeys"
      :active-menu-name="visibleActiveMenuName"
      :below-header="hybridLayout"
      :collapsed="sidebarCollapsed"
      :desktop-logo-visible="desktopSidebarLogoVisible"
      :flush="flushLayout"
      :logo-text="logoText"
      :menu-options="sidebarMenuOptions"
      :selected-theme="selectedTheme"
      :sidebar-style="sidebarStyle"
      :site-title="siteTitle"
      :theme-dropdown-options="themeDropdownOptions"
      @navigate="navigate"
      @select-theme="selectTheme"
      @update:collapsed="updateSidebarCollapsed"
    />
    <AppMobileSidebar
      v-model:expanded-keys="menuExpandedKeys"
      :active-menu-name="visibleActiveMenuName"
      :flush="flushLayout"
      :logo-text="logoText"
      :menu-options="mobileMenuOptions"
      :open="mobileOpen"
      :sidebar-style="sidebarStyle"
      :site-title="siteTitle"
      :theme-dropdown-options="themeDropdownOptions"
      :selected-theme="selectedTheme"
      @close-mobile="closeMobile"
      @navigate="navigate"
      @select-theme="selectTheme"
    />

    <NLayout
      class="h-full min-w-0 overflow-hidden transition-[padding] duration-300 ease-out"
      content-class="flex flex-col h-full"
      :class="shellOffsetClass"
      :native-scrollbar="false"
    >
      <NLayoutHeader
        class="sticky top-0 z-10 shrink-0"
        :class="flushLayout ? 'rounded-none' : 'rounded-naive'"
      >
        <AppHeader
          v-if="!topNavLayout && !hybridLayout"
          v-model:collapsed="sidebarCollapsed"
          v-model:mobile-open="mobileOpen"
          :breadcrumbs="breadcrumbs"
          :flush="flushLayout"
          :show-theme-switch="false"
          :theme-dropdown-options="themeDropdownOptions"
          :user="user"
          :user-dropdown-options="userDropdownOptions"
          :user-label="userLabel"
          @navigate="navigate"
          @refresh="refreshPage"
          @select-theme="selectTheme"
          @user-action="selectUserAction"
        />
        <AppHeader
          v-else
          v-model:collapsed="sidebarCollapsed"
          v-model:mobile-open="mobileOpen"
          class="lg:hidden"
          :breadcrumbs="breadcrumbs"
          :flush="flushLayout"
          :show-theme-switch="false"
          :theme-dropdown-options="themeDropdownOptions"
          :user="user"
          :user-dropdown-options="userDropdownOptions"
          :user-label="userLabel"
          @navigate="navigate"
          @refresh="refreshPage"
          @select-theme="selectTheme"
          @user-action="selectUserAction"
        />
        <AppTopNav
          v-if="topNavLayout || hybridLayout"
          class="hidden lg:flex"
          :active-menu-name="visibleActiveMenuName"
          :flush="flushLayout"
          :logo-text="logoText"
          :menu-options="topMenuOptions"
          :selected-menu-key="topSelectedMenuKey"
          :site-title="siteTitle"
          :theme-dropdown-options="themeDropdownOptions"
          :top-menu-centered="!hybridLayout && topMenuCentered"
          :user="user"
          :user-dropdown-options="userDropdownOptions"
          :user-label="userLabel"
          @navigate="navigate"
          @refresh="refreshPage"
          @select-theme="selectTheme"
          @user-action="selectUserAction"
        />
      </NLayoutHeader>

      <NLayoutContent
        class="flex-1 relative flex min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto transition-[padding] duration-300 ease-out"
        content-class="flex flex-col h-full"
        :class="contentOffsetClass"
        :native-scrollbar="false"
      >
        <main class="ha-main min-w-0 overflow-x-clip flex-1">
          <div :class="contentWidthClass">
            <div
              v-if="loading || !layoutReady"
              class="rounded-naive border border-base-border bg-base-card p-4 text-sm text-base-muted"
            >
              页面加载中...
            </div>
            <!--
              导航期间保留旧页面(顶部 loading bar 已在提示),新页面就绪后淡入,不再闪一块占位。
              页面组件是多根节点,Transition 只认单根元素:必须套一层 div 承载过渡,
              否则 out-in 的 leave 永远结束不了,新页面根本不挂载(表现为 main 空白,要刷新才出来)。
            -->
            <RouterView v-else v-slot="{ Component }">
              <Transition mode="out-in" name="ha-page">
                <div :key="routeViewKey">
                  <component :is="Component" />
                </div>
              </Transition>
            </RouterView>
          </div>
        </main>
        <footer class="mt-2 p-4 text-center text-xs text-base-muted">
          Copyright © 2026 {{ siteTitle }}. All rights reserved.
        </footer>
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
.ha-main {
  padding: 1rem;
  padding-bottom: 0;
}

.ha-layout--hybrid .ha-main {
  padding: 1rem 0 0;
}

/* 页面切换:out-in,旧页面先退场再进新页面,避免两页并排导致的高度跳动。 */
.ha-page-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.ha-page-leave-active {
  transition: opacity 0.12s ease;
}

.ha-page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.ha-page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ha-page-enter-active,
  .ha-page-leave-active {
    transition: none;
  }
}
</style>
