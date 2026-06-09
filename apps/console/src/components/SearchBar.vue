<script setup lang="ts">
import { NButton, NCard, NInput } from 'naive-ui'

defineEmits<{
  search: []
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <NCard class="mb-4">
    <div class="flex flex-col gap-2 sm:flex-row">
      <NInput v-model:value="model" clearable placeholder="搜索关键词" />
      <NButton type="primary" @click="$emit('search')">
        搜索
      </NButton>
    </div>
  </NCard>
</template>
