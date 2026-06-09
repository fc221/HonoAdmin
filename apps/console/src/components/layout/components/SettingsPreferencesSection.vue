<script setup lang="ts">
import { NSelect, NSwitch, useThemeVars } from 'naive-ui'
import { computed } from 'vue'
import { useLayoutStore } from '../../../stores/layout'
import { sidebarLogoStyleOptions, sidebarMenuStyleOptions } from '../layout-config'

const layoutStore = useLayoutStore()
const themeVars = useThemeVars()
const sidebarLogoSelectOptions = computed(() =>
  sidebarLogoStyleOptions.map(option => ({
    label: option.label,
    value: option.value,
  })),
)
const sidebarMenuSelectOptions = computed(() =>
  sidebarMenuStyleOptions.map(option => ({
    label: option.label,
    value: option.value,
  })),
)
</script>

<template>
  <section>
    <h3 class="mb-3 text-sm font-semibold" :style="{ color: themeVars.textColor1 }">
      偏好
    </h3>
    <div class="space-y-2">
      <label
        class="flex items-center justify-between border p-3"
        :class="layoutStore.canCollapseSidebar ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
        :style="{ borderColor: themeVars.borderColor, borderRadius: themeVars.borderRadius }"
      >
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium" :style="{ color: themeVars.textColor1 }">默认折叠侧边栏</span>
          <span class="text-xs" :style="{ color: themeVars.textColor3 }">仅作用于含侧边栏的布局</span>
        </span>
        <NSwitch
          :disabled="!layoutStore.canCollapseSidebar"
          :value="layoutStore.sidebarCollapsed"
          @update:value="layoutStore.setSidebarCollapsed"
        />
      </label>

      <div
        class="border p-3"
        :class="layoutStore.canUseSidebarStyle ? '' : 'opacity-50'"
        :style="{ borderColor: themeVars.borderColor, borderRadius: themeVars.borderRadius }"
      >
        <div class="mb-2 flex flex-col">
          <span class="text-sm font-medium" :style="{ color: themeVars.textColor1 }">侧边栏样式</span>
          <span class="text-xs" :style="{ color: themeVars.textColor3 }">分别配置 logo 和 menu 风格</span>
        </div>
        <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-2">
          <span class="text-xs" :style="{ color: themeVars.textColor3 }">Logo</span>
          <NSelect
            :disabled="!layoutStore.canUseSidebarStyle"
            :input-props="{ 'aria-label': '侧边栏 Logo 样式' }"
            :options="sidebarLogoSelectOptions"
            size="small"
            :value="layoutStore.sidebarLogoStyle"
            @update:value="layoutStore.setSidebarLogoStyle"
          />
          <span class="text-xs" :style="{ color: themeVars.textColor3 }">Menu</span>
          <NSelect
            :disabled="!layoutStore.canUseSidebarStyle"
            :input-props="{ 'aria-label': '侧边栏菜单样式' }"
            :options="sidebarMenuSelectOptions"
            size="small"
            :value="layoutStore.sidebarMenuStyle"
            @update:value="layoutStore.setSidebarMenuStyle"
          />
        </div>
      </div>

      <label
        class="flex items-center justify-between border p-3"
        :class="layoutStore.canUseTopNavOptions ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
        :style="{ borderColor: themeVars.borderColor, borderRadius: themeVars.borderRadius }"
      >
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium" :style="{ color: themeVars.textColor1 }">顶部菜单居中</span>
          <span class="text-xs" :style="{ color: themeVars.textColor3 }">菜单在 header 中居中</span>
        </span>
        <NSwitch
          :disabled="!layoutStore.canUseTopNavOptions"
          :value="layoutStore.topMenuCentered"
          @update:value="layoutStore.setTopMenuCentered"
        />
      </label>

      <label
        class="flex items-center justify-between border p-3"
        :class="layoutStore.canUseTopNavOptions ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"
        :style="{ borderColor: themeVars.borderColor, borderRadius: themeVars.borderRadius }"
      >
        <span class="flex min-w-0 flex-col">
          <span class="text-sm font-medium" :style="{ color: themeVars.textColor1 }">Main 窄屏</span>
          <span class="text-xs" :style="{ color: themeVars.textColor3 }">同步收窄 main 和顶部 header 内容</span>
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
