<script setup lang="ts">
import type { ResourceAction, ResourceField, ResourceList } from '@hono-admin/server/api/schema'
import { NButton, NCard, NInput, NPagination, useLoadingBar, useMessage, useNotification } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '../../../api/client'
import AppIcon from '../../../components/AppIcon.vue'
import DataTable from '../../../components/DataTable.vue'
import ResourceFormModal from '../../../components/ResourceFormModal.vue'

const route = useRoute()
const loadingBar = useLoadingBar()
const message = useMessage()
const notification = useNotification()
const data = ref<ResourceList | null>(null)
const formFields = ref<ResourceField[]>([])
const formInitial = ref<Record<string, unknown>>({})
const formMode = ref<'create' | 'edit'>('create')
const formOpen = ref(false)
const keyword = ref('')
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const selectedId = ref<number | null>(null)
const submitting = ref(false)

const modalTitle = computed(() =>
  formMode.value === 'create'
    ? `新增${data.value?.title ?? ''}`
    : `编辑${data.value?.title ?? ''}`,
)

async function load() {
  loading.value = true
  loadingBar.start()
  try {
    data.value = await apiClient.getResource('admin', resourceName(), {
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
    })
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('列表加载失败', reason, '列表加载失败。')
  }
  finally {
    loading.value = false
  }
}

async function handleTopAction(action: ResourceAction) {
  if (action.key === 'create') {
    formMode.value = 'create'
    formFields.value = data.value?.createFields ?? []
    formInitial.value = {}
    selectedId.value = null
    formOpen.value = true
    return
  }

  submitting.value = true
  try {
    const result = await apiClient.runResourceAction('admin', resourceName(), action.key)
    message.success(result.message)
    await load()
  }
  catch (reason) {
    notifyError('操作失败', reason, '操作失败。')
  }
  finally {
    submitting.value = false
  }
}

async function handleRowAction(action: ResourceAction, row: Record<string, unknown>) {
  const id = Number(row.id)
  if (!Number.isInteger(id) || id <= 0) {
    message.error('资源 ID 不正确。')
    return
  }

  if (action.key === 'edit') {
    submitting.value = true
    try {
      const detail = await apiClient.getResourceDetail('admin', resourceName(), id)
      formMode.value = 'edit'
      formFields.value = detail.fields
      formInitial.value = detail.data
      selectedId.value = id
      formOpen.value = true
    }
    catch (reason) {
      notifyError('详情加载失败', reason, '详情加载失败。')
    }
    finally {
      submitting.value = false
    }
    return
  }

  if (action.key === 'delete') {
    submitting.value = true
    try {
      const result = await apiClient.deleteResource('admin', resourceName(), id)
      message.success(result.message)
      await load()
    }
    catch (reason) {
      notifyError('删除失败', reason, '删除失败。')
    }
    finally {
      submitting.value = false
    }
  }
}

async function submitForm(input: Record<string, unknown>) {
  submitting.value = true
  try {
    const result = formMode.value === 'create'
      ? await apiClient.createResource('admin', resourceName(), input)
      : await apiClient.updateResource('admin', resourceName(), selectedId.value ?? 0, input)
    message.success(result.message)
    formOpen.value = false
    await load()
  }
  catch (reason) {
    notifyError('保存失败', reason, '保存失败。')
  }
  finally {
    submitting.value = false
  }
}

function resourceName() {
  return String(route.meta.resource)
}

function resetAndLoad() {
  page.value = 1
  void load()
}

function notifyError(title: string, reason: unknown, fallback: string) {
  notification.error({
    content: reason instanceof Error ? reason.message : fallback,
    duration: 4500,
    title,
  })
}

watch(() => route.fullPath, load)
onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <NCard class="overflow-hidden">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <NButton
            v-for="action in data?.actions ?? []"
            :key="action.key"
            size="small"
            :type="action.danger ? 'error' : 'primary'"
            :loading="submitting"
            @click="handleTopAction(action)"
          >
            <template v-if="action.key === 'create'" #icon>
              <AppIcon name="ri:add-line" />
            </template>
            {{ action.label }}
          </NButton>
        </div>

        <div class="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto" style="width: min(20rem, 100%)">
          <NInput
            v-model:value="keyword"
            clearable
            :placeholder="String(route.meta.searchPlaceholder ?? '关键词搜索')"
            size="small"
            style="width: min(16rem, 100%)"
            @keyup.enter="resetAndLoad"
          >
            <template #prefix>
              <AppIcon name="ri:search-line" />
            </template>
          </NInput>
          <NButton size="small" type="primary" @click="resetAndLoad">
            搜索
          </NButton>
        </div>
      </div>

      <DataTable
        :data="data"
        :framed="false"
        :loading="loading"
        :row-actions="data?.rowActions ?? []"
        @row-action="handleRowAction"
      />
      <div class="mt-4 flex justify-end">
        <NPagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="data?.pagination.total ?? 0"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="load"
          @update:page-size="resetAndLoad"
        />
      </div>
    </NCard>
  </div>
  <ResourceFormModal
    v-model:show="formOpen"
    :fields="formFields"
    :initial="formInitial"
    :submitting="submitting"
    :title="modalTitle"
    @cancel="formOpen = false"
    @submit="submitForm"
  />
</template>
