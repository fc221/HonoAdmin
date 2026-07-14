<script setup lang="ts">
import type { UserProfile } from '@hono-admin/server/api/schema'
import type { DropdownOption } from 'naive-ui'
import type { BreadcrumbItem } from '../helpers'
import { NAvatar, NBreadcrumb, NBreadcrumbItem, NButton, NDropdown } from 'naive-ui'
import { computed, defineAsyncComponent } from 'vue'
import AppIcon from '../../AppIcon.vue'
import { getLogoText } from '../helpers'

const props = withDefaults(defineProps<{
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
  'roleSwitch': [key: string | number]
  'selectTheme': [key: string | number]
  'userAction': [key: string | number]
  'update:collapsed': [collapsed: boolean]
  'update:mobileOpen': [open: boolean]
}>()

const canEditInterface = import.meta.env.DEV
const SettingsDrawer = canEditInterface
  ? defineAsyncComponent(() => import('./SettingsDrawer.vue'))
  : null

// 角色一键切换:显示当前角色,点击切到下一个(多角色则循环),不必展开下拉。
const roles = computed(() => props.user?.roles ?? [])
const currentRole = computed(() =>
  roles.value.find(role => role.id === props.user?.activeRoleId) ?? roles.value[0] ?? null,
)
const nextRole = computed(() => {
  if (roles.value.length < 2) {
    return null
  }
  const index = roles.value.findIndex(role => role.id === currentRole.value?.id)
  return roles.value[(index + 1) % roles.value.length]
})

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
      <NButton
        v-if="nextRole"
        quaternary
        size="small"
        class="gap-1! px-2!"
        :title="`当前角色：${currentRole?.name} · 点击切换到 ${nextRole.name}`"
        @click="emit('roleSwitch', nextRole.id)"
      >
        <template #icon>
          <AppIcon name="ri:user-shared-2-line" />
        </template>
        <span class="hidden text-sm lg:inline">{{ currentRole?.name }}</span>
      </NButton>
      <component :is="SettingsDrawer" v-if="canEditInterface && SettingsDrawer" />
      <NDropdown
        trigger="hover"
        :options="userDropdownOptions"
        @select="key => emit('userAction', key)"
      >
        <NButton quaternary class="h-9! gap-2! px-2!" title="用户菜单">
          <NAvatar round size="small" :src="user?.avatar || undefined">
            {{ getLogoText(userLabel) }}
          </NAvatar>
          <span class="ml-2 hidden max-w-28 truncate text-sm lg:inline">{{ userLabel }}</span>
          <AppIcon name="ri:arrow-down-s-line" />
        </NButton>
      </NDropdown>
    </div>
  </header>
</template>
