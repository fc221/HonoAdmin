<script setup lang="ts">
import { useLayoutStore } from '../../../stores/layout'
import AppIcon from '../../AppIcon.vue'
import { layoutVariantOptions } from '../layout-config'
import LayoutVariantPreview from './LayoutVariantPreview.vue'

const layoutStore = useLayoutStore()
</script>

<template>
  <section>
    <h3 class="mb-3 text-sm font-semibold text-base-content">
      布局
    </h3>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="option in layoutVariantOptions"
        :key="option.value"
        type="button"
        :aria-pressed="layoutStore.variant === option.value"
        class="group flex min-w-0 flex-col items-stretch gap-2 border p-2 text-left transition hover:shadow-sm"
        :style="{
          borderColor: layoutStore.variant === option.value ? 'var(--primary-color)' : 'var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: layoutStore.variant === option.value ? '0 0 0 2px var(--hover-color)' : 'none',
          color: 'var(--text-color-1)',
        }"
        @click="layoutStore.setVariant(option.value)"
      >
        <LayoutVariantPreview :kind="option.value" />
        <span class="flex min-w-0 items-center justify-between gap-2 text-xs">
          <span class="truncate">{{ option.label }}</span>
          <AppIcon
            v-if="layoutStore.variant === option.value"
            class="shrink-0 text-primary"
            name="ri:check-line"
          />
        </span>
      </button>
    </div>
  </section>
</template>
