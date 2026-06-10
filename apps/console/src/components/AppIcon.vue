<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    color?: string
    name: string
    size?: number | string
  }>(),
  {
    color: undefined,
    size: undefined,
  },
)
</script>

<template>
  <Icon
    v-bind="$attrs"
    :icon="name"
    :width="size"
    :height="size"
    :style="color ? { color } : undefined"
  />
</template>
