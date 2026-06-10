<script setup lang="ts">
import type { DropdownOption, MenuOption, MenuProps } from 'naive-ui'
import type { LayoutSidebarLogoStyle, LayoutSidebarMenuStyle } from '../layout-config'
import { NButton, NDropdown, NLayoutSider, NMenu, useThemeVars } from 'naive-ui'
import { computed } from 'vue'
import AppIcon from '../../AppIcon.vue'
import { findMenuHref } from '../helpers'

const props = withDefaults(defineProps<{
  activeMenuName: string
  belowHeader?: boolean
  collapsed: boolean
  desktopLogoVisible?: boolean
  expandedKeys: Array<string | number>
  flush?: boolean
  logoText: string
  menuOptions: MenuOption[]
  selectedTheme: string
  sidebarLogoStyle: LayoutSidebarLogoStyle
  sidebarMenuStyle: LayoutSidebarMenuStyle
  siteTitle: string
  themeDropdownOptions: DropdownOption[]
}>(), {
  belowHeader: false,
  desktopLogoVisible: true,
  flush: false,
})

const emit = defineEmits<{
  'navigate': [href: string]
  'selectTheme': [key: string | number]
  'update:collapsed': [collapsed: boolean]
  'update:expandedKeys': [keys: Array<string | number>]
}>()

const themeVars = useThemeVars()
const expandedKeysModel = computed({
  get: () => props.expandedKeys,
  set: value => emit('update:expandedKeys', value),
})
const selectedMenuKey = computed({
  get: () => props.activeMenuName,
  set: (key) => {
    const href = findMenuHref(props.menuOptions, key)
    if (!href)
      return
    emit('navigate', href)
  },
})
const logoClass = computed(() =>
  [
    props.sidebarLogoStyle === 'hidden' ? 'hidden' : '',
    props.desktopLogoVisible ? '' : 'lg:hidden',
    props.collapsed ? 'grid place-items-center gap-0! p-0!' : '',
  ].filter(Boolean).join(' '),
)
const menuShellClass = computed(() =>
  props.collapsed || props.sidebarMenuStyle === 'plain'
    ? 'bg-transparent px-0'
    : 'p-2',
)
const logoStyle = computed(() => ({
  background: props.sidebarLogoStyle === 'brand'
    ? `linear-gradient(135deg, ${themeVars.value.primaryColor}, ${themeVars.value.primaryColorHover})`
    : 'transparent',
  borderRadius: props.sidebarLogoStyle === 'plain' ? '0' : themeVars.value.borderRadius,
  color: props.sidebarLogoStyle === 'brand' ? '#ffffff' : themeVars.value.textColor1,
}))
const logoMarkStyle = computed(() => ({
  background: props.sidebarLogoStyle === 'brand' && !props.collapsed
    ? 'rgba(255, 255, 255, 0.2)'
    : themeVars.value.primaryColor,
  borderRadius: themeVars.value.borderRadius,
  color: '#ffffff',
}))
const menuShellStyle = computed(() => ({
  background: props.collapsed || props.sidebarMenuStyle === 'plain'
    ? 'transparent'
    : themeVars.value.tableHeaderColor,
  borderRadius: themeVars.value.borderRadius,
}))
const collapsedMenuThemeOverrides: NonNullable<MenuProps['themeOverrides']> = {
  itemHeight: '32px',
}
const menuThemeOverrides = computed(() =>
  props.collapsed ? collapsedMenuThemeOverrides : undefined,
)
const desktopSiderClass = computed(() =>
  props.belowHeader
    ? props.flush
      ? 'lg:left-0 lg:top-16 lg:h-[calc(100vh-4rem)] lg:rounded-none'
      : 'lg:left-4 lg:top-24 lg:h-[calc(100vh-7rem)]'
    : props.flush
      ? 'lg:left-0 lg:top-0 lg:h-screen lg:rounded-none'
      : 'lg:left-4 lg:top-4 lg:h-[calc(100vh-2rem)]',
)
const siderClass = computed(() => [
  'max-lg:hidden!',
  desktopSiderClass.value,
  'lg:translate-x-0',
].join(' '))
</script>

<template>
  <NLayoutSider
    collapse-mode="width"
    :collapsed="collapsed"
    :collapsed-width="80"
    content-class="flex h-full min-w-0 flex-col items-center gap-3 p-4"
    :native-scrollbar="false"
    :style="{
      background: themeVars.cardColor,
      borderRadius: flush ? '0' : themeVars.borderRadius,
      color: themeVars.textColor1,
      position: 'fixed',
      zIndex: 60,
    }"
    :width="256"
    class="min-w-0 overflow-hidden shadow-xl shadow-black/10 transition-[transform,width,box-shadow] duration-300 ease-out lg:shadow-none"
    :class="siderClass"
    @update:collapsed="value => emit('update:collapsed', value)"
  >
    <div class="flex w-full min-w-0 items-center gap-3 overflow-hidden p-4" :class="logoClass" :style="logoStyle">
      <div class="grid size-12 shrink-0 place-items-center text-lg font-bold" :style="logoMarkStyle">
        {{ logoText }}
      </div>
      <div v-if="!collapsed" class="min-w-0">
        <div class="max-w-40 truncate text-lg font-bold">
          {{ siteTitle }}
        </div>
      </div>
    </div>

    <nav
      class="ha-sidebar-menu w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
      :class="menuShellClass"
      :style="menuShellStyle"
    >
      <NMenu
        v-model:value="selectedMenuKey"
        v-model:expanded-keys="expandedKeysModel"
        :collapsed="collapsed"
        :collapsed-icon-size="16"
        :collapsed-width="48"
        :icon-size="18"
        :indent="18"
        :options="menuOptions"
        :root-indent="18"
        :theme-overrides="menuThemeOverrides"
      />
    </nav>

    <div
      class="flex w-full min-w-0 justify-between gap-2 border-t pt-2"
      :class="collapsed ? 'flex-col items-center justify-end' : 'items-center'"
      :style="{ borderColor: themeVars.borderColor }"
    >
      <NDropdown :options="themeDropdownOptions" trigger="click" :width="176" @select="key => emit('selectTheme', key)">
        <NButton quaternary circle :title="`当前主题：${selectedTheme}`">
          <template #icon>
            <AppIcon name="ri:palette-line" />
          </template>
        </NButton>
      </NDropdown>
      <span class="inline-flex">
        <NButton :circle="collapsed" quaternary @click="emit('update:collapsed', !collapsed)">
          <template #icon>
            <AppIcon :name="collapsed ? 'ri:arrow-right-s-line' : 'ri:arrow-left-s-line'" />
          </template>
          <span v-if="!collapsed">折叠导航</span>
        </NButton>
      </span>
    </div>
  </NLayoutSider>
</template>
