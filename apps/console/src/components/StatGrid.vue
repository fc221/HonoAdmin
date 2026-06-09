<script setup lang="ts">
import type { DashboardPayload } from '@hono-admin/server/api/schema'
import { NCard, NText } from 'naive-ui'

defineProps<{
  stats: DashboardPayload['stats']
}>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <NCard
      v-for="stat in stats"
      :key="stat.label"
      data-card="stat"
    >
      <NText tag="div" depth="3" class="text-sm">
        {{ stat.label }}
      </NText>
      <div class="mt-2 text-2xl font-semibold">
        {{ stat.value }}
      </div>
    </NCard>
  </div>
</template>
