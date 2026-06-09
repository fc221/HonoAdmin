<script setup lang="ts">
import type { MenuItem, UserProfile } from '@hono-admin/server/api/schema'
import type { DropdownOption } from 'naive-ui'
import { NLayout, NLayoutContent, NLayoutHeader, useThemeVars } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, h, ref, watch } from 'vue'
import { useLayoutStore } from '../../stores/layout'
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

const props = withDefaults(defineProps<{
  activeMenuName: string
  menus?: MenuItem[]
  section: string
  siteTitle: string
  user: UserProfile | null
}>(), {
  menus: () => [],
})

const emit = defineEmits<{
  logout: []
  navigate: [href: string]
  refresh: []
  roleSwitch: [roleId: number]
}>()

const themeStore = useThemeStore()
const layoutStore = useLayoutStore()
layoutStore.normalizeForConsole()
const themeVars = useThemeVars()
const { selectedTheme } = storeToRefs(themeStore)
const {
  mainWidth,
  sidebarCollapsed,
  sidebarLogoStyle,
  sidebarMenuStyle,
  topMenuCentered,
  variant,
} = storeToRefs(layoutStore)
const mobileOpen = ref(false)
const menuExpandedKeys = ref<Array<string | number>>([])

const activePath = computed(() => getActivePath(props.menus, props.activeMenuName) ?? [])
const activeRoot = computed(() => activePath.value[0] ?? props.menus[0])
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
const expandableMenuKeys = computed(() => new Set(getExpandableMenuKeys(props.menus)))
const logoText = computed(() => getLogoText(props.siteTitle))
const menuOptions = computed(() => createMenuOptions(props.menus))
const rootMenuOptions = computed(() => createRootMenuOptions(props.menus))
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
const topSelectedMenuKey = computed(() => activeRoot.value?.name ?? props.activeMenuName)
const desktopSidebarLogoVisible = computed(() => !hybridLayout.value)
const userLabel = computed(() => props.user?.nickname || props.user?.username || '用户')
const themeDropdownOptions = computed<DropdownOption[]>(() =>
  themeStore.themeOptions.map(option => ({
    icon: renderThemeIcon(option.value),
    key: option.value,
    label: () => h('span', { class: 'flex min-w-0 items-center justify-between gap-3' }, [
      h('span', { class: 'truncate' }, option.label),
      selectedTheme.value === option.value
        ? h(AppIcon, { color: themeVars.value.primaryColor, name: 'check' })
        : null,
    ]),
  })),
)
const roleOptions = computed<DropdownOption[]>(() =>
  props.user?.roles.map(role => ({
    disabled: props.user?.activeRoleId === role.id,
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
  () => [props.menus, props.activeMenuName] as const,
  () => {
    const validKeys = expandableMenuKeys.value
    const nextKeys = new Set(menuExpandedKeys.value.filter(key => validKeys.has(key)))
    for (const key of getExpandedMenuKeys(props.menus, props.activeMenuName, activePath.value)) {
      nextKeys.add(key)
    }
    menuExpandedKeys.value = [...nextKeys]
  },
  { immediate: true },
)

function closeMobile() {
  mobileOpen.value = false
}

function refreshPage() {
  emit('refresh')
}

function selectTheme(key: string | number) {
  themeStore.setTheme(key)
}

function updateSidebarCollapsed(collapsed: boolean) {
  layoutStore.setSidebarCollapsed(collapsed)
}

function selectUserAction(key: string | number) {
  if (key === 'profile') {
    emit('navigate', '/user/profile')
  }
  if (key === 'logout') {
    emit('logout')
  }
}

function selectRole(key: string | number) {
  const roleId = Number(key)
  if (Number.isInteger(roleId) && roleId > 0) {
    emit('roleSwitch', roleId)
  }
}
</script>

<template>
  <NLayout
    :has-sider="layoutHasSider"
    class="ha-layout min-w-0"
    content-class="h-full"
    :class="[rootClass, layoutVariantClass]"
    :native-scrollbar="false"
    :style="{ background: themeVars.bodyColor, color: themeVars.textColor1 }"
  >
    <AppSidebar
      v-if="!topNavLayout"
      v-model:expanded-keys="menuExpandedKeys"
      :active-menu-name="activeMenuName"
      :below-header="hybridLayout"
      :collapsed="sidebarCollapsed"
      :desktop-logo-visible="desktopSidebarLogoVisible"
      :flush="flushLayout"
      :logo-text="logoText"
      :menu-options="sidebarMenuOptions"
      :selected-theme="selectedTheme"
      :sidebar-logo-style="sidebarLogoStyle"
      :sidebar-menu-style="sidebarMenuStyle"
      :site-title="siteTitle"
      :theme-dropdown-options="themeDropdownOptions"
      @navigate="href => emit('navigate', href)"
      @select-theme="selectTheme"
      @update:collapsed="updateSidebarCollapsed"
    />
    <AppMobileSidebar
      v-if="mobileOpen"
      v-model:expanded-keys="menuExpandedKeys"
      :active-menu-name="activeMenuName"
      :flush="flushLayout"
      :logo-text="logoText"
      :menu-options="mobileMenuOptions"
      :sidebar-logo-style="sidebarLogoStyle"
      :sidebar-menu-style="sidebarMenuStyle"
      :site-title="siteTitle"
      :theme-dropdown-options="themeDropdownOptions"
      :selected-theme="selectedTheme"
      @close-mobile="closeMobile"
      @navigate="href => emit('navigate', href)"
      @select-theme="selectTheme"
    />

    <NLayout
      class="h-full min-w-0 overflow-hidden transition-[padding] duration-300 ease-out"
      content-class="flex flex-col h-full"
      :class="shellOffsetClass"
      :native-scrollbar="false"
    >
      <NLayoutHeader
        class="sticky top-0 z-10 shrink-0" :style="{
          borderRadius: flushLayout ? '0' : themeVars.borderRadius,
        }"
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
          @navigate="href => emit('navigate', href)"
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
          @navigate="href => emit('navigate', href)"
          @refresh="refreshPage"
          @role-switch="selectRole"
          @select-theme="selectTheme"
          @user-action="selectUserAction"
        />
        <AppTopNav
          v-if="topNavLayout || hybridLayout"
          class="hidden lg:flex"
          :active-menu-name="activeMenuName"
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
          @navigate="href => emit('navigate', href)"
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
            <slot />
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
</style>
