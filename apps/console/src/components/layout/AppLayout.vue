<script setup lang="ts">
import type { DropdownOption } from 'naive-ui'
import { NLayout, NLayoutContent, NLayoutHeader, useLoadingBar, useNotification } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient, ApiClientError } from '../../api/client'
import { useLayoutStore } from '../../stores/layout'
import { useSessionStore } from '../../stores/session'
import { useThemeStore } from '../../stores/theme'
import AppIcon from '../AppIcon.vue'
import AppHeader from './components/AppHeader.vue'
import AppMobileSidebar from './components/AppMobileSidebar.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppTopNav from './components/AppTopNav.vue'
import {
  createMenuOptions,
  createRootMenuOptions,
  getActivePath,
  getExpandableMenuKeys,
  getExpandedMenuKeys,
  getLogoText,
  renderThemeIcon,
} from './helpers'
import {
  isFlushVariant,
  isHybridVariant,
  isTopNavVariant,
} from './layout-config'

const route = useRoute()
const router = useRouter()
const loadingBar = useLoadingBar()
const notification = useNotification()
const themeStore = useThemeStore()
const layoutStore = useLayoutStore()
const sessionStore = useSessionStore()
layoutStore.normalizeForConsole()
const { selectedTheme } = storeToRefs(themeStore)
const { loading, menus, siteTitle, user } = storeToRefs(sessionStore)
const {
  mainWidth,
  sidebarCollapsed,
  sidebarStyle,
  topMenuCentered,
  variant,
} = storeToRefs(layoutStore)
const mobileOpen = ref(false)
const menuExpandedKeys = ref<Array<string | number>>([])
const routeRefreshKey = ref(0)
const layoutReady = ref(false)
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

const activePath = computed(() => getActivePath(menus.value, visibleActiveMenuName.value) ?? [])
const activeRoot = computed(() => activePath.value[0] ?? menus.value[0])
const breadcrumbs = computed(() => activePath.value.map(item => ({
  href: item.href,
  label: item.label,
  name: item.name,
})))
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
const expandableMenuKeys = computed(() => new Set(getExpandableMenuKeys(menus.value)))
const logoText = computed(() => getLogoText(siteTitle.value))
const menuOptions = computed(() => createMenuOptions(menus.value))
const rootMenuOptions = computed(() => createRootMenuOptions(menus.value))
const activeChildrenMenus = computed(() => {
  const root = activeRoot.value
  if (!root) {
    return []
  }

  return root.children?.length ? root.children : [root]
})
const sidebarMenuOptions = computed(() =>
  hybridLayout.value ? createMenuOptions(activeChildrenMenus.value) : menuOptions.value,
)
const mobileSidebarMenuOptions = computed(() =>
  hybridLayout.value ? menuOptions.value : undefined,
)
const mobileMenuOptions = computed(() => mobileSidebarMenuOptions.value ?? menuOptions.value)
const topMenuOptions = computed(() =>
  hybridLayout.value ? rootMenuOptions.value : menuOptions.value,
)
const topSelectedMenuKey = computed(() => activeRoot.value?.name ?? visibleActiveMenuName.value)
const desktopSidebarLogoVisible = computed(() => !hybridLayout.value)
const userLabel = computed(() => user.value?.nickname || user.value?.username || '用户')
const themeDropdownOptions = computed<DropdownOption[]>(() =>
  themeStore.themeOptions.map(option => ({
    icon: renderThemeIcon(option.icon),
    key: option.value,
    label: () => h('span', { class: 'flex min-w-0 items-center justify-between gap-3' }, [
      h('span', { class: 'truncate' }, option.label),
      selectedTheme.value === option.value
        ? h(AppIcon, { class: 'text-primary', name: 'ri:check-line' })
        : null,
    ]),
  })),
)
const roleOptions = computed<DropdownOption[]>(() =>
  user.value?.roles.map(role => ({
    disabled: user.value?.activeRoleId === role.id,
    key: role.id,
    label: role.name,
  })) ?? [],
)
const userDropdownOptions = computed<DropdownOption[]>(() => [
  {
    key: 'profile',
    label: '个人中心',
  },
  {
    key: 'logout',
    label: '退出登录',
  },
])

watch(
  () => [menus.value, visibleActiveMenuName.value] as const,
  () => {
    const validKeys = expandableMenuKeys.value
    const nextKeys = new Set(menuExpandedKeys.value.filter(key => validKeys.has(key)))
    for (const key of getExpandedMenuKeys(menus.value, visibleActiveMenuName.value, activePath.value)) {
      nextKeys.add(key)
    }
    menuExpandedKeys.value = [...nextKeys]
  },
  { immediate: true },
)

// 仅在 surface(admin/user)切换时拉一次布局,菜单内切换不重拉(ensureLayout 自带缓存)。
// 加载/401/428/异常的编排从原 AppShell 整体搬到这里。
watch(
  surface,
  async (nextSurface) => {
    layoutReady.value = false
    sessionStore.setActiveSurface(nextSurface)
    const requestedPath = route.fullPath
    loadingBar.start()
    try {
      await sessionStore.ensureLayout(nextSurface)
      layoutReady.value = true
      loadingBar.finish()
    }
    catch (reason) {
      if (reason instanceof ApiClientError && reason.status === 401) {
        loadingBar.finish()
        await router.replace(`${loginPath.value}?${new URLSearchParams({ returnTo: requestedPath })}`)
        return
      }
      if (reason instanceof ApiClientError && reason.status === 428) {
        loadingBar.finish()
        await redirectAfterInstallStateError()
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

function closeMobile() {
  mobileOpen.value = false
}

async function redirectAfterInstallStateError() {
  const status = await apiClient.installStatus().catch(() => null)
  await router.replace(status?.installed ? '/admin/system/update' : '/install')
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

function selectTheme(key: string | number) {
  themeStore.setTheme(key)
}

function updateSidebarCollapsed(collapsed: boolean) {
  layoutStore.setSidebarCollapsed(collapsed)
}

function selectUserAction(key: string | number) {
  if (key === 'profile') {
    navigate('/user/profile')
  }
  if (key === 'logout') {
    logout()
  }
}

function selectRole(key: string | number) {
  const roleId = Number(key)
  if (Number.isInteger(roleId) && roleId > 0) {
    switchRole(roleId)
  }
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
    // 角色切换会清空缓存,这里按当前 surface 再拉一次以恢复菜单/用户。
    await sessionStore.ensureLayout(surface.value)
    refreshPage()
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
          :role-dropdown-options="roleOptions"
          :show-theme-switch="false"
          :theme-dropdown-options="themeDropdownOptions"
          :user="user"
          :user-dropdown-options="userDropdownOptions"
          :user-label="userLabel"
          @navigate="navigate"
          @refresh="refreshPage"
          @role-switch="selectRole"
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
          :role-dropdown-options="roleOptions"
          :show-theme-switch="false"
          :theme-dropdown-options="themeDropdownOptions"
          :user="user"
          :user-dropdown-options="userDropdownOptions"
          :user-label="userLabel"
          @navigate="navigate"
          @refresh="refreshPage"
          @role-switch="selectRole"
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
          :role-dropdown-options="roleOptions"
          :selected-menu-key="topSelectedMenuKey"
          :site-title="siteTitle"
          :theme-dropdown-options="themeDropdownOptions"
          :top-menu-centered="!hybridLayout && topMenuCentered"
          :user="user"
          :user-dropdown-options="userDropdownOptions"
          :user-label="userLabel"
          @navigate="navigate"
          @refresh="refreshPage"
          @role-switch="selectRole"
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
