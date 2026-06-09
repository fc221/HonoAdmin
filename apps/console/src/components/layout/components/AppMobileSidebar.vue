<script setup lang="ts">
import type { DropdownOption, MenuOption } from 'naive-ui'
import type { LayoutSidebarLogoStyle, LayoutSidebarMenuStyle } from '../layout-config'
import { NButton, NDropdown, NLayoutSider, NMenu, useThemeVars } from 'naive-ui'
import { computed } from 'vue'
import AppIcon from '../../AppIcon.vue'
import { findMenuHref } from '../helpers'

const props = withDefaults(defineProps<{
  activeMenuName: string
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
  flush: false,
})

const emit = defineEmits<{
  'closeMobile': []
  'navigate': [href: string]
  'selectTheme': [key: string | number]
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
    emit('closeMobile')
    emit('navigate', href)
  },
})
const mobileSiderClass = computed(() =>
  props.flush
    ? 'left-0 top-0 h-dvh rounded-none'
    : 'left-3 top-3 h-[calc(100dvh-1.5rem)]',
)
const logoClass = computed(() =>
  props.sidebarLogoStyle === 'hidden' ? 'hidden' : '',
)
const menuShellClass = computed(() =>
  props.sidebarMenuStyle === 'plain'
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
  background: props.sidebarLogoStyle === 'brand'
    ? 'rgba(255, 255, 255, 0.2)'
    : themeVars.value.primaryColor,
  borderRadius: themeVars.value.borderRadius,
  color: '#ffffff',
}))
const menuShellStyle = computed(() => ({
  background: props.sidebarMenuStyle === 'plain'
    ? 'transparent'
    : themeVars.value.tableHeaderColor,
  borderRadius: themeVars.value.borderRadius,
}))
</script>

<template>
  <div
    class="fixed inset-0 z-40 bg-black/35 lg:hidden"
    @click="emit('closeMobile')"
  />

  <NLayoutSider
    collapse-mode="width"
    :collapsed="false"
    :collapsed-width="80"
    content-class="flex h-full min-w-0 flex-col items-center gap-3 p-4"
    :native-scrollbar="false"
    :style="{
      background: themeVars.cardColor,
      borderRadius: flush ? '0' : themeVars.borderRadius,
      color: themeVars.textColor1,
      position: 'fixed',
      zIndex: 50,
    }"
    :width="256"
    class="min-w-0 overflow-hidden shadow-xl shadow-black/10 transition-transform duration-300 ease-out lg:hidden!"
    :class="mobileSiderClass"
  >
    <div class="flex w-full min-w-0 items-center gap-3 overflow-hidden p-4" :class="logoClass" :style="logoStyle">
      <div class="grid size-12 shrink-0 place-items-center text-lg font-bold" :style="logoMarkStyle">
        {{ logoText }}
      </div>
      <div class="min-w-0">
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
        :collapsed="false"
        :collapsed-icon-size="16"
        :collapsed-width="48"
        :icon-size="18"
        :indent="18"
        :options="menuOptions"
        :root-indent="18"
      />
    </nav>

    <div
      class="flex w-full min-w-0 items-center justify-between gap-2 border-t pt-2"
      :style="{ borderColor: themeVars.borderColor }"
    >
      <NDropdown :options="themeDropdownOptions" trigger="click" :width="176" @select="key => emit('selectTheme', key)">
        <NButton quaternary circle :title="`当前主题：${selectedTheme}`">
          <template #icon>
            <AppIcon name="palette" />
          </template>
        </NButton>
      </NDropdown>
      <NButton quaternary @click="emit('closeMobile')">
        <template #icon>
          <AppIcon name="close" />
        </template>
        <span>关闭导航</span>
      </NButton>
    </div>
  </NLayoutSider>
</template>
