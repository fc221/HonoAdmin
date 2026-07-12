<script setup lang="ts">
import type { DropdownOption, MenuOption } from 'naive-ui'
import type { LayoutSidebarStyle } from '../layout-config'
import { NButton, NDropdown, NLayoutSider, NMenu } from 'naive-ui'
import { computed } from 'vue'
import AppIcon from '../../AppIcon.vue'
import { findMenuHref } from '../helpers'

const props = withDefaults(defineProps<{
  activeMenuName: string
  expandedKeys: Array<string | number>
  flush?: boolean
  logoText: string
  menuOptions: MenuOption[]
  open: boolean
  selectedTheme: string
  sidebarStyle: LayoutSidebarStyle
  siteTitle: string
  themeDropdownOptions: DropdownOption[]
}>(), {
  flush: false,
})

const emit = defineEmits<{
  'closeMobile': []
  'navigate': [href: string, activeKey?: string | number]
  'selectTheme': [key: string | number]
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
    emit('closeMobile')
    emit('navigate', href, key)
  },
})
const mobileSiderClass = computed(() =>
  props.flush
    ? 'left-0 top-0 h-dvh rounded-none'
    : 'left-3 top-3 h-[calc(100dvh-1.5rem)]',
)
const menuShellClass = computed(() =>
  props.sidebarStyle === 'plain'
    ? 'bg-transparent px-0'
    : 'p-2',
)
const siderContentClass = computed(() =>
  props.sidebarStyle === 'plain'
    ? 'flex h-full min-w-0 flex-col items-center p-4'
    : 'flex h-full min-w-0 flex-col items-center gap-3 p-4',
)
const logoStyle = computed(() => ({
  background: props.sidebarStyle === 'card'
    ? 'linear-gradient(135deg, var(--primary-color), var(--primary-color-hover))'
    : 'transparent',
  borderRadius: props.sidebarStyle === 'plain' ? '0' : 'var(--border-radius)',
  color: props.sidebarStyle === 'card' ? '#ffffff' : 'var(--text-color-1)',
}))
const logoMarkStyle = computed(() => ({
  background: props.sidebarStyle === 'card'
    ? 'rgba(255, 255, 255, 0.2)'
    : 'var(--primary-color)',
  borderRadius: 'var(--border-radius)',
  color: '#ffffff',
}))
const menuShellStyle = computed(() => ({
  background: props.sidebarStyle === 'plain'
    ? 'transparent'
    : 'var(--table-header-color)',
  borderRadius: 'var(--border-radius)',
}))
</script>

<template>
  <Transition name="ha-mask">
    <div
      v-if="open"
      class="fixed inset-0 z-40 bg-black/35 lg:hidden"
      @click="emit('closeMobile')"
    />
  </Transition>

  <Transition name="ha-drawer">
    <NLayoutSider
      v-if="open"
      collapse-mode="width"
      :collapsed="false"
      :collapsed-width="80"
      :content-class="siderContentClass"
      :native-scrollbar="false"
      :style="{
        background: 'var(--card-color)',
        borderRadius: flush ? '0' : 'var(--border-radius)',
        color: 'var(--text-color-1)',
        position: 'fixed',
        zIndex: 50,
      }"
      :width="256"
      class="min-w-0 overflow-hidden shadow-xl shadow-black/10 lg:hidden!"
      :class="mobileSiderClass"
    >
      <div class="flex w-full min-w-0 items-center gap-3 overflow-hidden p-4" :style="logoStyle">
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
        class="flex w-full min-w-0 items-center justify-between gap-2 border-t border-base-border pt-2"
      >
        <NDropdown :options="themeDropdownOptions" trigger="click" :width="176" @select="key => emit('selectTheme', key)">
          <NButton quaternary circle :title="`当前主题：${selectedTheme}`">
            <template #icon>
              <AppIcon name="ri:palette-line" />
            </template>
          </NButton>
        </NDropdown>
        <NButton quaternary @click="emit('closeMobile')">
          <template #icon>
            <AppIcon name="ri:close-line" />
          </template>
          <span>关闭导航</span>
        </NButton>
      </div>
    </NLayoutSider>
  </Transition>
</template>

<!--
  非 scoped:过渡类要落在 NLayoutSider 的根元素上,scoped 选择器带 data-v 属性时匹配不到它。
  类名带 ha- 前缀,不会撞到别的样式。
-->
<style>
/* 抽屉从屏幕左侧滑入,遮罩淡入;之前是 v-if 直接挂载,transition-transform 从没生效过。 */
.ha-drawer-enter-active,
.ha-drawer-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.ha-drawer-enter-from,
.ha-drawer-leave-to {
  transform: translateX(-110%);
}

.ha-mask-enter-active,
.ha-mask-leave-active {
  transition: opacity 0.28s ease;
}

.ha-mask-enter-from,
.ha-mask-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ha-drawer-enter-active,
  .ha-drawer-leave-active,
  .ha-mask-enter-active,
  .ha-mask-leave-active {
    transition: none;
  }
}
</style>
