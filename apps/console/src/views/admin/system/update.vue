<script setup lang="ts">
import type { UpdateStatus } from '@hono-admin/server/api/schema'
import { NAlert, NButton, NCard, NTag } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '../../../api/client'
import AppIcon from '../../../components/AppIcon.vue'
import { usePageFeedback } from '../../../composables/page-feedback'

const { loadingBar, message, notifyError } = usePageFeedback()
const loading = ref(false)
const migrating = ref(false)
const status = ref<UpdateStatus | null>(null)

const migration = computed(() => status.value?.migration ?? null)
const isComplete = computed(() => migration.value?.isComplete === true)
const pendingMigrations = computed(() => migration.value?.pendingMigrations ?? [])

async function load() {
  loading.value = true
  loadingBar.start()
  try {
    status.value = await apiClient.getUpdateStatus()
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('状态加载失败', reason, '状态加载失败。')
  }
  finally {
    loading.value = false
  }
}

async function migrate() {
  migrating.value = true
  loadingBar.start()
  try {
    const result = await apiClient.runUpdateMigrations()
    message.success(result.message)
    await load()
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('迁移失败', reason, '迁移失败。')
  }
  finally {
    migrating.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <NCard class="overflow-hidden">
      <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="mb-2 flex items-center gap-2">
            <AppIcon class="text-xl text-primary" name="ri:refresh-line" />
            <h2 class="text-lg font-semibold">
              数据库迁移
            </h2>
            <NTag v-if="migration" :type="isComplete ? 'success' : 'warning'" size="small" :bordered="false">
              {{ isComplete ? '已是最新' : '待迁移' }}
            </NTag>
          </div>
          <p class="text-sm text-base-muted">
            当前版本 {{ status?.currentVersion ?? '-' }}
          </p>
        </div>

        <NButton
          type="primary"
          :disabled="loading || isComplete"
          :loading="migrating"
          @click="migrate"
        >
          <template #icon>
            <AppIcon name="ri:play-circle-line" />
          </template>
          执行迁移
        </NButton>
      </div>

      <NAlert :type="isComplete ? 'success' : 'warning'" class="mb-5">
        <template v-if="isComplete">
          数据库结构已是最新。
        </template>
        <template v-else>
          待执行迁移 {{ migration?.pendingCount ?? 0 }} 个。
        </template>
      </NAlert>

      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded border border-base-border p-4">
          <div class="text-xs text-base-muted">
            已执行
          </div>
          <div class="mt-1 text-2xl font-semibold">
            {{ migration?.appliedCount ?? '-' }}
          </div>
        </div>
        <div class="rounded border border-base-border p-4">
          <div class="text-xs text-base-muted">
            待执行
          </div>
          <div class="mt-1 text-2xl font-semibold">
            {{ migration?.pendingCount ?? '-' }}
          </div>
        </div>
        <div class="rounded border border-base-border p-4">
          <div class="text-xs text-base-muted">
            最新代码迁移
          </div>
          <div class="mt-1 truncate font-mono text-sm font-semibold">
            {{ migration?.latestCodeMigrationId ?? '-' }}
          </div>
        </div>
      </div>

      <div class="mt-5 rounded border border-base-border">
        <div class="grid gap-3 border-b border-base-border px-4 py-3 text-xs font-medium text-base-muted md:grid-cols-[1fr_1fr]">
          <span>迁移 ID</span>
          <span>名称</span>
        </div>
        <div v-if="pendingMigrations.length" class="divide-y divide-base-border">
          <div
            v-for="item in pendingMigrations"
            :key="item.id"
            class="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_1fr]"
          >
            <span class="break-all font-mono">{{ item.id }}</span>
            <span>{{ item.name }}</span>
          </div>
        </div>
        <div v-else class="px-4 py-6 text-center text-sm text-base-muted">
          暂无待执行迁移
        </div>
      </div>
    </NCard>
  </div>
</template>
