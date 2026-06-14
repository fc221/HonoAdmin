<script setup lang="ts">
import { NSelect, NSwitch } from 'naive-ui'
import { computed } from 'vue'
import { useLayoutStore } from '../../../stores/layout'
import { sidebarStyleOptions } from '../layout-config'

const layoutStore = useLayoutStore()
const sidebarSelectOptions = computed(() =>
  sidebarStyleOptions.map(option => ({
    label: option.label,
    value: option.value,
  })),
)
</script>

<template>
  <section>
    <h3 class="mb-3 text-sm font-semibold text-base-content">
      偏好
    </h3>
    <div class="space-y-2">
      <label
        class="flex items-center justify-between border p-3 border-base-border rounded-naive"
        :class="layoutStore.canCollapseSidebar ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
      >
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium text-base-content">默认折叠侧边栏</span>
          <span class="text-xs text-base-muted">仅作用于含侧边栏的布局</span>
        </span>
        <NSwitch
          :disabled="!layoutStore.canCollapseSidebar"
          :value="layoutStore.sidebarCollapsed"
          @update:value="layoutStore.setSidebarCollapsed"
        />
      </label>

      <div
        class="flex items-center justify-between border p-3 border-base-border rounded-naive"
        :class="layoutStore.canUseSidebarStyle ? '' : 'opacity-50'"
      >
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium text-base-content">侧边栏样式</span>
          <span class="text-xs text-base-muted">卡片或简洁(logo 与 menu 联动)</span>
        </span>
        <NSelect
          class="max-w-28"
          :disabled="!layoutStore.canUseSidebarStyle"
          :input-props="{ 'aria-label': '侧边栏样式' }"
          :options="sidebarSelectOptions"
          size="small"
          :value="layoutStore.sidebarStyle"
          @update:value="layoutStore.setSidebarStyle"
        />
      </div>

      <label
        class="flex items-center justify-between border p-3 border-base-border rounded-naive"
        :class="layoutStore.canUseTopNavOptions ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
      >
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium text-base-content">顶部菜单居中</span>
          <span class="text-xs text-base-muted">菜单在 header 中居中</span>
        </span>
        <NSwitch
          :disabled="!layoutStore.canUseTopNavOptions"
          :value="layoutStore.topMenuCentered"
          @update:value="layoutStore.setTopMenuCentered"
        />
      </label>

      <label
        class="flex items-center justify-between border p-3 border-base-border rounded-naive"
        :class="layoutStore.canUseTopNavOptions ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
      >
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium text-base-content">Main 窄屏</span>
          <span class="text-xs text-base-muted">同步收窄 main 和顶部 header 内容</span>
        </span>
        <NSwitch
          :disabled="!layoutStore.canUseTopNavOptions"
          :value="layoutStore.mainWidth === 'narrow'"
          @update:value="value => layoutStore.setMainWidth(value ? 'narrow' : 'wide')"
        />
      </label>
    </div>
  </section>
</template>
