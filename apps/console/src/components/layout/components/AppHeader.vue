<script setup lang="ts">
import type { UserProfile } from '@hono-admin/server/api/schema'
import type { DropdownOption } from 'naive-ui'
import type { BreadcrumbItem } from '../helpers'
import { NAvatar, NBreadcrumb, NBreadcrumbItem, NButton, NDropdown } from 'naive-ui'
import { defineAsyncComponent } from 'vue'
import AppIcon from '../../AppIcon.vue'
import { getLogoText } from '../helpers'

withDefaults(defineProps<{
  breadcrumbs: BreadcrumbItem[]
  collapsed: boolean
  flush?: boolean
  showThemeSwitch?: boolean
  themeDropdownOptions?: DropdownOption[]
  user: UserProfile | null
  userDropdownOptions: DropdownOption[]
  userLabel: string
}>(), {
  flush: false,
  showThemeSwitch: false,
  themeDropdownOptions: () => [],
})

const emit = defineEmits<{
  'navigate': [href: string]
  'refresh': []
  'selectTheme': [key: string | number]
  'userAction': [key: string | number]
  'update:collapsed': [collapsed: boolean]
  'update:mobileOpen': [open: boolean]
}>()

const canEditInterface = import.meta.env.DEV
const SettingsDrawer = canEditInterface
  ? defineAsyncComponent(() => import('./SettingsDrawer.vue'))
  : null

function handleBreadcrumbClick(event: MouseEvent, href: string | undefined, isCurrent: boolean): void {
  if (!href || isCurrent) {
    return
  }

  event.preventDefault()
  emit('navigate', href)
}
</script>

<template>
  <header
    class="flex h-16 shrink-0 items-center justify-between px-4"
    :style="{
      background: 'var(--card-color)',
      borderRadius: flush ? '0' : 'var(--border-radius)',
      color: 'var(--text-color-1)',
    }"
  >
    <div class="flex min-w-0 items-center gap-2">
      <span class="lg:hidden">
        <NButton quaternary circle aria-label="打开菜单" @click="emit('update:mobileOpen', true)">
          <template #icon>
            <AppIcon name="ri:menu-fold-line" />
          </template>
        </NButton>
      </span>
      <span class="hidden lg:inline-flex">
        <NButton quaternary circle aria-label="折叠侧边栏" @click="emit('update:collapsed', !collapsed)">
          <template #icon>
            <AppIcon :name="collapsed ? 'ri:menu-unfold-line' : 'ri:menu-fold-line'" />
          </template>
        </NButton>
      </span>
      <NBreadcrumb class="min-w-0 overflow-hidden text-sm" separator="/">
        <NBreadcrumbItem
          v-for="(item, index) in breadcrumbs"
          :key="item.name"
          :href="item.href && index < breadcrumbs.length - 1 ? item.href : undefined"
          :clickable="Boolean(item.href && index < breadcrumbs.length - 1)"
          :show-separator="index < breadcrumbs.length - 1"
          @click="event => handleBreadcrumbClick(event, item.href, index === breadcrumbs.length - 1)"
        >
          <span class="block min-w-0 truncate">{{ item.label }}</span>
        </NBreadcrumbItem>
      </NBreadcrumb>
    </div>

    <div class="flex shrink-0 items-center gap-3 text-lg text-base-muted">
      <AppIcon name="ri:refresh-line" @click="emit('refresh')" />
      <NDropdown v-if="showThemeSwitch" :options="themeDropdownOptions" trigger="hover" :width="176" @select="key => emit('selectTheme', key)">
        <AppIcon name="ri:palette-line" />
      </NDropdown>
      <component :is="SettingsDrawer" v-if="canEditInterface && SettingsDrawer" />
      <NDropdown
        trigger="hover"
        :options="userDropdownOptions"
        :width="220"
        @select="key => emit('userAction', key)"
      >
        <NButton quaternary class="h-9! gap-2! px-2!" title="用户菜单">
          <NAvatar round size="small" :src="user?.avatar || undefined">
            {{ getLogoText(userLabel) }}
          </NAvatar>
          <span class="ml-2 hidden max-w-28 truncate text-sm lg:inline">{{ userLabel }}</span>
          <AppIcon class="hidden lg:inline-block" name="ri:arrow-down-s-line" />
        </NButton>
      </NDropdown>
    </div>
  </header>
</template>
