<script setup lang="ts">
import type { ResourceAction, ResourceField, ResourceList } from '@hono-admin/server/api/schema'
import { NButton, NCard, NInput, NPagination, useDialog } from 'naive-ui'
import { computed, onMounted, ref, useSlots, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '../api/client'
import { usePageFeedback } from '../composables/page-feedback'
import AppIcon from './AppIcon.vue'
import DataTable from './DataTable.vue'
import ResourceFormModal from './ResourceFormModal.vue'

// 通用资源 CRUD 页:列表、搜索、分页、表单弹窗、操作分发全部由后端资源描述驱动。
// 页面差异通过 props(surface/resource/extraQuery)和插槽(#filters、#cell-*)注入。
const props = withDefaults(defineProps<{
  extraQuery?: Record<string, string | number | undefined>
  resource?: string
  surface?: 'admin' | 'user'
}>(), {
  extraQuery: () => ({}),
  resource: '',
  surface: 'admin',
})

const route = useRoute()
const dialog = useDialog()
const { loadingBar, message, notifyError } = usePageFeedback()
const slots = useSlots()
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

// 富文本图片上传类型取资源名首个连字符之后的部分:web-notification → notification。
// 没有富文本字段的资源拿到的值不会被使用,无副作用。
const richTextUploadType = computed(() => {
  const name = resourceName()
  const index = name.indexOf('-')
  return index >= 0 ? name.slice(index + 1) : name
})

// 只把 #cell-* 作用域插槽转发给 DataTable;#filters 留在工具栏,不能透传下去。
const cellSlotNames = computed(() => Object.keys(slots).filter(name => name.startsWith('cell-')))

async function load() {
  loading.value = true
  loadingBar.start()
  try {
    data.value = await apiClient.getResource(props.surface, resourceName(), {
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
      ...props.extraQuery,
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

  if (action.danger) {
    confirmDanger(action, () => runTopAction(action))
    return
  }

  await runTopAction(action)
}

async function runTopAction(action: ResourceAction) {
  submitting.value = true
  try {
    const result = await apiClient.runResourceAction(props.surface, resourceName(), action.key)
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
      const detail = await apiClient.getResourceDetail(props.surface, resourceName(), id)
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
      const result = await apiClient.deleteResource(props.surface, resourceName(), id)
      message.success(result.message)
      await load()
    }
    catch (reason) {
      notifyError('删除失败', reason, '删除失败。')
    }
    finally {
      submitting.value = false
    }
    return
  }

  // 其余行操作统一走后端行为分发,危险操作先弹确认。
  if (action.danger) {
    confirmDanger(action, () => runRowAction(action, id))
    return
  }

  await runRowAction(action, id)
}

async function runRowAction(action: ResourceAction, id: number) {
  submitting.value = true
  try {
    const result = await apiClient.runResourceItemAction(props.surface, resourceName(), id, action.key)
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

function confirmDanger(action: ResourceAction, run: () => void) {
  dialog.warning({
    title: '确认操作',
    content: `确定要「${action.label}」吗?此操作不可撤销。`,
    negativeText: '取消',
    positiveText: '确定',
    onPositiveClick: run,
  })
}

async function submitForm(input: Record<string, unknown>) {
  submitting.value = true
  try {
    const result = formMode.value === 'create'
      ? await apiClient.createResource(props.surface, resourceName(), input)
      : await apiClient.updateResource(props.surface, resourceName(), selectedId.value ?? 0, input)
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
  return props.resource || String(route.meta.resource)
}

function resetAndLoad() {
  page.value = 1
  void load()
}

// 多个通用资源路由共用同一组件定义,路由切换时 vue-router 会复用实例:
// 必须重置搜索、分页和旧数据,否则上一个资源的状态会带进下一个资源。
watch(() => route.fullPath, () => {
  keyword.value = ''
  page.value = 1
  data.value = null
  void load()
})
// 外部筛选条件变化时回到第一页重新加载。比较序列化值:父组件重渲染会产生同值新对象,
// 按引用比较会触发多余请求(如挂载后角色选项就绪时的一次重复加载)。
watch(() => JSON.stringify(props.extraQuery), (next, prev) => {
  if (next !== prev) {
    resetAndLoad()
  }
})
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

        <div class="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto" :style="{ width: $slots.filters ? 'min(28rem, 100%)' : 'min(20rem, 100%)' }">
          <slot name="filters" />
          <NInput
            v-model:value="keyword"
            clearable
            :placeholder="String(route.meta.searchPlaceholder ?? '关键词搜索')"
            size="small"
            :style="{ width: $slots.filters ? 'min(14rem, 100%)' : 'min(16rem, 100%)' }"
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
      >
        <template v-for="name in cellSlotNames" :key="name" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps ?? {}" />
        </template>
      </DataTable>
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
    :rich-text-upload-type="richTextUploadType"
    :submitting="submitting"
    :title="modalTitle"
    @cancel="formOpen = false"
    @submit="submitForm"
  />
</template>
