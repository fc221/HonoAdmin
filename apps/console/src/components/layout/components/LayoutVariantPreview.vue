<script setup lang="ts">
import type { LayoutVariant } from '../layout-config'
import { useThemeVars } from 'naive-ui'

defineProps<{
  kind: LayoutVariant
}>()

const themeVars = useThemeVars()
</script>

<template>
  <div v-if="kind === 'sidebar'" class="aspect-4/3 w-full rounded-md p-1.5" :style="{ background: themeVars.tableHeaderColor }">
    <div class="flex h-full gap-1">
      <div class="w-1/3 rounded-sm" :style="{ background: themeVars.primaryColor }" />
      <div class="flex flex-1 flex-col gap-1">
        <div class="h-2 rounded-sm" :style="{ background: themeVars.cardColor }" />
        <div class="flex-1 rounded-sm mx-1" :style="{ background: themeVars.cardColor }" />
      </div>
    </div>
  </div>

  <div v-else-if="kind === 'sidebar-flush'" class="aspect-4/3 w-full overflow-hidden rounded-md" :style="{ background: themeVars.tableHeaderColor }">
    <div class="flex h-full">
      <div class="w-1/3" :style="{ background: themeVars.primaryColor }" />
      <div class="flex flex-1 flex-col">
        <div class="h-3" :style="{ background: themeVars.cardColor }" />
        <div class="flex-1 m-1" :style="{ background: themeVars.cardColor }" />
      </div>
    </div>
  </div>

  <div v-else-if="kind === 'top-nav'" class="aspect-4/3 w-full rounded-md p-1.5" :style="{ background: themeVars.tableHeaderColor }">
    <div class="flex h-full flex-col gap-1">
      <div class="h-2 rounded-sm" :style="{ background: themeVars.primaryColor }" />
      <div class="flex-1 rounded-sm mx-1" :style="{ background: themeVars.cardColor }" />
    </div>
  </div>

  <div v-else-if="kind === 'hybrid'" class="aspect-4/3 w-full rounded-md p-1.5" :style="{ background: themeVars.tableHeaderColor }">
    <div class="flex h-full flex-col gap-1">
      <div class="h-2 rounded-sm" :style="{ background: themeVars.primaryColor }" />
      <div class="flex min-h-0 flex-1 gap-1">
        <div class="w-1/4 rounded-sm" :style="{ background: themeVars.hoverColor }" />
        <div class="flex-1 rounded-sm" :style="{ background: themeVars.cardColor }" />
      </div>
    </div>
  </div>

  <div v-else-if="kind === 'hybrid-flush'" class="aspect-4/3 w-full overflow-hidden rounded-md" :style="{ background: themeVars.tableHeaderColor }">
    <div class="flex h-full flex-col">
      <div class="h-3" :style="{ background: themeVars.primaryColor }" />
      <div class="flex min-h-0 flex-1">
        <div class="w-1/4" :style="{ background: themeVars.hoverColor }" />
        <div class="flex-1 m-1" :style="{ background: themeVars.cardColor }" />
      </div>
    </div>
  </div>

  <div v-else class="aspect-4/3 w-full overflow-hidden rounded-md" :style="{ background: themeVars.tableHeaderColor }">
    <div class="flex h-full flex-col">
      <div class="h-3" :style="{ background: themeVars.primaryColor }" />
      <div class="flex-1 m-1" :style="{ background: themeVars.cardColor }" />
    </div>
  </div>
</template>
