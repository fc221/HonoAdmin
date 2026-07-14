<script setup lang="ts">
import type { DashboardPayload } from '@hono-admin/server/api/schema'
import { formatFileSize } from '@hono-admin/utils/common'
import { NCard, NEmpty, NProgress, NTag, NTooltip, useLoadingBar, useNotification } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '../../api/client'
import StatGrid from '../../components/StatGrid.vue'

const router = useRouter()
const loadingBar = useLoadingBar()
const notification = useNotification()
const dashboard = ref<DashboardPayload | null>(null)

const activity = computed(() => dashboard.value?.activity ?? [])
const activityMax = computed(() =>
  Math.max(1, ...activity.value.map(point => point.total)),
)
const activityTotal = computed(() =>
  activity.value.reduce((total, point) => total + point.total, 0),
)
// 区间统计由后台 rollup 任务维护,最多约 5 分钟延迟;展示更新时间,不实时补扫日志。
const statsUpdatedLabel = computed(() => {
  const updatedAt = dashboard.value?.statsUpdatedAt
  return updatedAt
    ? new Date(updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : ''
})
const load = computed(() => dashboard.value?.load ?? null)
const loadGauges = computed(() => {
  const metrics = load.value
  if (!metrics) {
    return []
  }

  return [
    {
      detail: `${metrics.cpuLoad.toFixed(2)} / ${metrics.cpuCores} 核`,
      label: 'CPU 负载',
      percent: metrics.cpuLoadPercent,
    },
    {
      detail: `${formatFileSize(metrics.memoryUsed)} / ${formatFileSize(metrics.memoryTotal)}`,
      label: '内存',
      percent: metrics.memoryUsedPercent,
    },
    {
      detail: `${formatFileSize(metrics.storageUsed)} / ${formatFileSize(metrics.storageTotal)}`,
      label: '存储',
      percent: metrics.storageUsedPercent,
    },
  ]
})
const system = computed(() => dashboard.value?.system ?? null)
const systemRows = computed(() => {
  const info = system.value
  if (!info) {
    return []
  }

  const metrics = load.value

  return [
    { label: '版本', value: info.appVersion },
    { label: '数据库', value: info.databaseDialect },
    {
      label: '迁移',
      value: info.migrationsPending > 0
        ? `${info.migrationsApplied} 已应用 / ${info.migrationsPending} 待执行`
        : `${info.migrationsApplied} 已应用`,
    },
    { label: '时区', value: info.timezone },
    ...(metrics
      ? [
          { label: '进程内存', value: formatFileSize(metrics.processMemory) },
          { label: '系统运行', value: formatUptime(metrics.uptimeSeconds) },
        ]
      : []),
  ]
})

onMounted(async () => {
  loadingBar.start()
  try {
    dashboard.value = await apiClient.getDashboard('admin')
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

// 柱高按窗口内最大值归一;0 也留一条基线,免得空白日看起来像缺数据。
function barHeight(total: number): string {
  return `${Math.max(2, Math.round((total / activityMax.value) * 100))}%`
}

// 负载超过 90% 标红、70% 标黄:一眼能看出该不该管。
function gaugeStatus(percent: number): 'error' | 'success' | 'warning' {
  if (percent >= 90) {
    return 'error'
  }

  return percent >= 70 ? 'warning' : 'success'
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时 ${minutes} 分`
}
</script>

<template>
  <StatGrid :stats="dashboard?.stats ?? []" />

  <div v-if="dashboard?.canViewSystemPanels" class="mt-4 grid gap-4 lg:grid-cols-3">
    <NCard class="lg:col-span-2" content-class="flex flex-col">
      <template #header>
        <div class="flex items-baseline justify-between gap-2">
          <span>近 7 天操作趋势</span>
          <span class="text-sm text-base-muted">
            共 {{ activityTotal }} 次<template v-if="statsUpdatedLabel"> · 更新于 {{ statsUpdatedLabel }}</template>
          </span>
        </div>
      </template>
      <div class="flex min-h-40 flex-1 items-stretch gap-2">
        <NTooltip v-for="point in activity" :key="point.label" trigger="hover">
          <template #trigger>
            <div class="flex flex-1 flex-col justify-end gap-2">
              <div class="text-center text-xs font-medium" :class="point.total === 0 ? 'text-transparent' : ''">
                {{ point.total }}
              </div>
              <div
                class="mx-auto w-full max-w-12 rounded-t bg-primary transition-[height] duration-300"
                :class="point.total === 0 ? 'opacity-30' : ''"
                :style="{ height: barHeight(point.total) }"
              />
              <div class="text-center text-xs text-base-muted">
                {{ point.label }}
              </div>
            </div>
          </template>
          {{ point.label }}:{{ point.total }} 次操作
        </NTooltip>
      </div>
    </NCard>

    <NCard title="系统状态">
      <dl v-if="systemRows.length" class="space-y-3 text-sm">
        <div v-for="row in systemRows" :key="row.label" class="flex justify-between gap-4">
          <dt class="text-base-muted">
            {{ row.label }}
          </dt>
          <dd class="truncate font-medium">
            {{ row.value }}
          </dd>
        </div>
      </dl>
      <NEmpty v-else description="暂无系统信息" size="small" />

      <div v-if="loadGauges.length" class="mt-4 grid grid-cols-3 gap-2 border-t border-base-border pt-4">
        <NTooltip v-for="gauge in loadGauges" :key="gauge.label" trigger="hover">
          <template #trigger>
            <div class="flex flex-col items-center gap-2">
              <!-- naive 圆环默认 120px,且它的运行时样式压得过 class,尺寸只能用内联 style 覆盖。 -->
              <NProgress
                style="width: 80px"
                :percentage="Math.min(100, gauge.percent)"
                :status="gaugeStatus(gauge.percent)"
                :stroke-width="8"
                type="circle"
              >
                <!-- 环内空间窄,取整数并禁止换行;精确值在 tooltip 里。 -->
                <span class="whitespace-nowrap text-xs font-semibold">{{ Math.round(gauge.percent) }}%</span>
              </NProgress>
              <span class="text-xs text-base-muted">{{ gauge.label }}</span>
            </div>
          </template>
          {{ gauge.label }} {{ gauge.percent }}%:{{ gauge.detail }}
        </NTooltip>
      </div>
      <div v-else class="mt-4 rounded-naive border border-base-border p-3 text-xs text-base-muted">
        当前运行时(Cloudflare Workers)读不到宿主机指标。
      </div>
    </NCard>
  </div>

  <div v-if="dashboard?.canViewSystemPanels" class="mt-4 grid gap-4 lg:grid-cols-2">
    <NCard title="最近操作日志">
      <template #header-extra>
        <button class="text-sm text-primary" type="button" @click="router.push('/admin/system/operate-log')">
          全部
        </button>
      </template>
      <ul v-if="dashboard?.logs.length" class="space-y-3 text-sm">
        <li v-for="log in dashboard.logs" :key="log.id" class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate">
              {{ log.message }}
            </div>
            <div class="text-xs text-base-muted">
              {{ log.username }} · {{ log.createdAt }}
            </div>
          </div>
          <NTag :type="log.status === 'success' ? 'success' : 'error'" round size="small">
            {{ log.status === 'success' ? '成功' : '失败' }}
          </NTag>
        </li>
      </ul>
      <NEmpty v-else description="暂无操作日志" size="small" />
    </NCard>

    <NCard title="待处理反馈">
      <template #header-extra>
        <button class="text-sm text-primary" type="button" @click="router.push('/admin/web/feedback')">
          去处理
        </button>
      </template>
      <ul v-if="dashboard?.feedbacks.length" class="space-y-3 text-sm">
        <li v-for="feedback in dashboard.feedbacks" :key="feedback.id" class="min-w-0">
          <div class="truncate">
            {{ feedback.title }}
          </div>
          <div class="text-xs text-base-muted">
            {{ feedback.username }} · {{ feedback.createdAt }}
          </div>
        </li>
      </ul>
      <NEmpty v-else description="没有待处理反馈" size="small" />
    </NCard>
  </div>
</template>
