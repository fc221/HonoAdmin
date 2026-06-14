<script setup lang="ts">
import type { DropdownOption, MenuOption, MenuProps } from 'naive-ui'
import type { LayoutSidebarStyle } from '../layout-config'
import { NButton, NDropdown, NLayoutSider, NMenu } from 'naive-ui'
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
  sidebarStyle: LayoutSidebarStyle
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
    props.desktopLogoVisible ? '' : 'lg:hidden',
    props.collapsed ? 'grid place-items-center gap-0! p-0!' : '',
  ].filter(Boolean).join(' '),
)
const menuShellClass = computed(() =>
  props.collapsed || props.sidebarStyle === 'plain'
    ? 'bg-transparent px-0'
    : 'p-2',
)
const siderContentClass = computed(() =>
  props.sidebarStyle === 'plain'
    ? 'flex h-full min-w-0 flex-col items-center p-4'
    : 'flex h-full min-w-0 flex-col items-center gap-3 p-4',
)

const logoStyle = computed(() => ({
  borderRadius: props.sidebarStyle === 'plain' ? '0' : 'var(--border-radius)',
  color: props.sidebarStyle === 'card' ? '#ffffff' : 'var(--text-color-1)',
}))
const menuShellStyle = computed(() => ({
  background: props.collapsed || props.sidebarStyle === 'plain'
    ? 'transparent'
    : 'var(--table-header-color)',
  borderRadius: 'var(--border-radius)',
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
    :content-class="siderContentClass"
    :native-scrollbar="false"
    :style="{
      background: 'var(--card-color)',
      borderRadius: flush ? '0' : 'var(--border-radius)',
      color: 'var(--text-color-1)',
      position: 'fixed',
      zIndex: 60,
    }"
    :width="256"
    class="min-w-0 overflow-hidden shadow-xl shadow-black/10 transition-[transform,width,box-shadow] duration-300 ease-out lg:shadow-none"
    :class="siderClass"
    @update:collapsed="value => emit('update:collapsed', value)"
  >
    <div
      class="flex w-full min-w-0 items-center gap-3 overflow-hidden p-4"
      :class="[logoClass, sidebarStyle === 'card' ? 'bg-linear-to-br from-primary to-primary/30' : '']"
      :style="logoStyle"
    >
      <div
        class="grid size-12 shrink-0 place-items-center rounded-naive text-lg font-bold text-white"
        :class="sidebarStyle === 'card' ? 'bg-white/20' : 'bg-primary'"
      >
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
      class="flex w-full min-w-0 justify-between gap-2 border-t border-base-border pt-2"
      :class="collapsed ? 'flex-col items-center justify-end' : 'items-center'"
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
