<script setup lang="ts">
import { NSelect, useThemeVars } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useThemeStore } from '../../../stores/theme'

const themeStore = useThemeStore()
const themeVars = useThemeVars()
const { selectedTheme } = storeToRefs(themeStore)
const themeSelectOptions = computed(() =>
  themeStore.themeOptions.map(option => ({
    label: option.label,
    value: option.value,
  })),
)
</script>

<template>
  <section>
    <h3 class="mb-3 text-sm font-semibold" :style="{ color: themeVars.textColor1 }">
      主题
    </h3>
    <div class="flex justify-center">
      <NSelect
        class="max-w-40"
        :input-props="{ 'aria-label': '主题' }"
        :options="themeSelectOptions"
        size="small"
        :value="selectedTheme"
        @update:value="themeStore.setTheme"
      />
    </div>
  </section>
</template>
