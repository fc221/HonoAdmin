<script setup lang="ts">
import { useThemeVars } from 'naive-ui'

defineProps<{
  description?: string
  title: string
}>()

const themeVars = useThemeVars()
</script>

<template>
  <div class="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: themeVars.borderColor }">
    <div class="min-w-0">
      <h1 class="truncate text-lg font-semibold" :style="{ color: themeVars.textColor1 }">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 text-sm" :style="{ color: themeVars.textColor3 }">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex w-full shrink-0 items-center gap-2 sm:w-auto">
      <slot name="actions" />
    </div>
  </div>
</template>
