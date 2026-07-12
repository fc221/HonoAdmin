<script setup lang="ts">
import type { DashboardPayload } from '@hono-admin/server/api/schema'
import { useLoadingBar, useNotification } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { apiClient } from '../../api/client'
import StatGrid from '../../components/StatGrid.vue'

const dashboard = ref<DashboardPayload | null>(null)
const loadingBar = useLoadingBar()
const notification = useNotification()

onMounted(async () => {
  loadingBar.start()
  try {
    dashboard.value = await apiClient.getDashboard('user')
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notification.error({
      content: reason instanceof Error ? reason.message : '仪表盘加载失败。',
      duration: 4500,
      title: '仪表盘加载失败',
    })
  }
})
</script>

<template>
  <StatGrid :stats="dashboard?.stats ?? []" />
</template>
