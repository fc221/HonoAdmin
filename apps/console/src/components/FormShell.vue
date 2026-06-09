<script setup lang="ts">
import { NCard, NText } from 'naive-ui'

defineProps<{
  description?: string
  title: string
}>()
</script>

<template>
  <NCard>
    <template #header>
      <h2 class="text-sm font-semibold">
        {{ title }}
      </h2>
      <NText v-if="description" tag="p" depth="3" class="mt-1 text-xs">
        {{ description }}
      </NText>
    </template>
    <slot />
  </NCard>
</template>
