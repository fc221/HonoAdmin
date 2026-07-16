<script setup lang="ts">
import ResourcePage from '../../../components/ResourcePage.vue'
</script>

<template>
  <ResourcePage>
    <template #cell-name="{ row }">
      <div class="flex flex-col items-start gap-0.5">
        <span class="text-sm">{{ row.name }}</span>
        <span v-if="row.description" class="text-xs text-base-muted">{{ row.description }}</span>
      </div>
    </template>
  </ResourcePage>
</template>
