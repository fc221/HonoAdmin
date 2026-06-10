<script setup lang="ts">
defineProps<{
  description?: string
  title: string
}>()
</script>

<template>
  <div class="mb-4 flex flex-col gap-3 border-b border-base-border pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0">
      <h1 class="truncate text-large font-semibold text-base-content">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 text-small text-base-muted">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex w-full shrink-0 items-center gap-2 sm:w-auto">
      <slot name="actions" />
    </div>
  </div>
</template>
