<script setup lang="ts">
import type { UserProfile } from '@hono-admin/server/api/schema'
import type { DropdownOption, MenuOption } from 'naive-ui'
import { NAvatar, NButton, NDropdown, NMenu } from 'naive-ui'
import { computed, defineAsyncComponent } from 'vue'
import AppIcon from '../../AppIcon.vue'
import { findMenuHref, getLogoText } from '../helpers'

const props = withDefaults(defineProps<{
  activeMenuName: string
  flush?: boolean
  logoText: string
  menuOptions: MenuOption[]
  roleDropdownOptions?: DropdownOption[]
  selectedMenuKey: string
  siteTitle: string
  themeDropdownOptions: DropdownOption[]
  topMenuCentered?: boolean
  user: UserProfile | null
  userDropdownOptions: DropdownOption[]
  userLabel: string
}>(), {
  flush: false,
  roleDropdownOptions: () => [],
  topMenuCentered: false,
})

const emit = defineEmits<{
  navigate: [href: string, activeKey?: string | number]
  refresh: []
  roleSwitch: [key: string | number]
  selectTheme: [key: string | number]
  userAction: [key: string | number]
}>()

const canEditInterface = import.meta.env.DEV
const SettingsDrawer = canEditInterface
  ? defineAsyncComponent(() => import('./SettingsDrawer.vue'))
  : null
const homeHref = computed(() => findFirstMenuHref(props.menuOptions) || '/')
const selectedMenuKeyModel = computed({
  get: () => props.selectedMenuKey || props.activeMenuName,
  set: (key) => {
    const href = findMenuHref(props.menuOptions, key)
    if (href) {
      emit('navigate', href, key)
    }
  },
})

function findFirstMenuHref(options: MenuOption[]): string {
  for (const option of options) {
    if (typeof option.href === 'string') {
      return option.href
    }

    const href = findFirstMenuHref((option.children ?? []) as MenuOption[])
    if (href) {
      return href
    }
  }

  return ''
}
</script>

<template>
  <header
    class="flex h-16 shrink-0 items-center px-4"
    :style="{
      background: 'var(--card-color)',
      borderBottom: flush ? '1px solid var(--border-color)' : '0',
      borderRadius: flush ? '0' : 'var(--border-radius)',
      color: 'var(--text-color-1)',
    }"
  >
    <div class="flex h-full w-full min-w-0 items-center gap-3">
      <button
        type="button"
        class="flex min-w-0 shrink-0 items-center gap-2 px-2"
        :aria-label="siteTitle"
        @click="emit('navigate', homeHref)"
      >
        <span
          class="grid size-9 shrink-0 place-items-center text-sm font-bold text-white"
          :style="{
            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-color-hover))',
            borderRadius: 'var(--border-radius)',
          }"
        >
          {{ logoText }}
        </span>
        <span class="max-w-40 truncate text-base font-semibold text-base-content">
          {{ siteTitle }}
        </span>
      </button>

      <nav
        class="ha-topnav-menu min-w-0 flex-1 overflow-hidden"
        :class="{ 'ha-topnav-menu--centered': topMenuCentered }"
        aria-label="主导航"
      >
        <NMenu
          v-model:value="selectedMenuKeyModel"
          mode="horizontal"
          :responsive="!topMenuCentered"
          :icon-size="18"
          :options="menuOptions"
        />
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-3 text-lg text-base-muted">
        <AppIcon name="ri:refresh-line" @click="emit('refresh')" />
        <NDropdown :options="themeDropdownOptions" trigger="hover" :width="176" @select="key => emit('selectTheme', key)">
          <AppIcon name="ri:palette-line" />
        </NDropdown>
        <NDropdown
          v-if="roleDropdownOptions.length > 1"
          trigger="hover"
          :options="roleDropdownOptions"
          @select="key => emit('roleSwitch', key)"
        >
          <AppIcon name="ri:shield-check-line" />
        </NDropdown>
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
            <span class="ml-2 hidden max-w-28 truncate text-sm xl:inline">{{ userLabel }}</span>
            <AppIcon class="hidden xl:inline-block" name="ri:arrow-down-s-line" />
          </NButton>
        </NDropdown>
      </div>
    </div>
  </header>
</template>

<style scoped>
/*
 * 顶部菜单居中:
 * naive 横向菜单根是 width:100% 的 flex,容器上的 justify-center 无效(菜单占满整行)。
 * responsive 模式下菜单项被包进 .v-overflow 包裹层,justify-content 也居中不到菜单项,
 * 所以居中时关闭 responsive(:responsive="!topMenuCentered"),让菜单项成为根的直接
 * flex 子元素,再用 justify-content: center 居中。顶部菜单项通常不多,关闭 responsive 可接受。
 */
.ha-topnav-menu--centered :deep(.n-menu.n-menu--horizontal) {
  justify-content: center;
}
</style>
