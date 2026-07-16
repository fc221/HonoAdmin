<script setup lang="ts">
import type { DashboardPayload } from '@hono-admin/server/api/schema'
import { onMounted, ref } from 'vue'
import { apiClient } from '../../api/client'
import StatGrid from '../../components/StatGrid.vue'
import { usePageFeedback } from '../../composables/page-feedback'

const dashboard = ref<DashboardPayload | null>(null)
const { loadingBar, notifyError } = usePageFeedback()

onMounted(async () => {
  loadingBar.start()
  try {
    dashboard.value = await apiClient.getDashboard('user')
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('仪表盘加载失败', reason, '仪表盘加载失败。')
  }
})
</script>

<template>
  <StatGrid :stats="dashboard?.stats ?? []" />
</template>
