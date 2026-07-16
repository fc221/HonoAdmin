<script setup lang="ts">
import type { ResourceAction, ResourceList } from '@hono-admin/server/api/schema'
import type { DataTableColumns, FormInst, FormRules, UploadFileInfo } from 'naive-ui'
import { formatFileSize } from '@hono-admin/utils/common'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NImage,
  NInput,
  NModal,
  NPagination,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  NText,
} from 'naive-ui'
import { computed, h, onMounted, ref } from 'vue'
import { apiClient } from '../../../api/client'
import AppIcon from '../../../components/AppIcon.vue'
import Upload from '../../../components/Upload.vue'
import { usePageFeedback } from '../../../composables/page-feedback'

const { loadingBar, message, notifyError } = usePageFeedback()
const data = ref<ResourceList | null>(null)
const keyword = ref('')
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const submitting = ref(false)
const uploadFiles = ref<UploadFileInfo[]>([])
const uploadFormRef = ref<FormInst | null>(null)
const uploadOpen = ref(false)
const uploadType = ref('avatar')
const uploadTypeFilter = ref('')
const uploadRules: FormRules = {
  uploadFiles: [{
    message: '请选择要上传的图片。',
    trigger: ['change'],
    validator: () => selectedUploadFiles().length > 0,
  }],
  uploadType: [{ message: '请选择上传类型', required: true, trigger: ['blur', 'change'] }],
}

const uploadTypeOptions = computed(() => {
  const field = data.value?.createFields.find(item => item.key === 'uploadType')
  return field?.options?.map(option => ({ label: option.label, value: String(option.value) })) ?? []
})

const uploadTypeFilterOptions = computed(() => [
  { label: '全部类型', value: '' },
  ...uploadTypeOptions.value,
])

const uploadTypeLabelMap = computed(() =>
  new Map(uploadTypeOptions.value.map(option => [option.value, option.label])),
)

const columns = computed((): DataTableColumns<Record<string, unknown>> => [
  { key: 'id', title: 'ID', width: 76 },
  {
    key: 'url',
    render: row => row.url
      ? h(NImage, {
          height: 48,
          imgProps: { class: 'object-cover' },
          objectFit: 'cover',
          previewDisabled: false,
          src: String(row.url),
          width: 48,
        })
      : '-',
    title: '预览',
    width: 92,
  },
  {
    key: 'originalName',
    render: row => h('div', { class: 'flex min-w-60 flex-col gap-1' }, [
      h('a', {
        class: 'font-medium hover:underline',
        href: String(row.url ?? '#'),
        target: '_blank',
      }, String(row.originalName ?? '-')),
      h(NText, { class: 'font-mono text-xs', depth: 3 }, { default: () => String(row.storageKey ?? '-') }),
      h(NText, { class: 'text-xs', depth: 3 }, { default: () => `${row.mimeType ?? '-'} / ${formatFileSize(row.fileSize)}` }),
    ]),
    title: '文件',
    width: 320,
  },
  {
    key: 'uploadType',
    render: row => h(NTag, { bordered: false, size: 'small', type: 'info' }, {
      default: () => uploadTypeLabelMap.value.get(String(row.uploadType ?? '')) ?? String(row.uploadType ?? '-'),
    }),
    title: '类型',
    width: 120,
  },
  {
    key: 'storageMode',
    render: row => h(NTag, { bordered: false, size: 'small' }, {
      default: () => String(row.storageMode) === 's3' ? 'S3 存储' : '本地存储',
    }),
    title: '存储',
    width: 120,
  },
  { key: 'userId', title: '上传用户', width: 110 },
  { key: 'createdAt', title: '上传时间', width: 180 },
  {
    fixed: 'right',
    key: '__actions',
    render: row => h(
      NPopconfirm,
      { onPositiveClick: () => deleteRow(row) },
      {
        default: () => `确认删除「${row.originalName ?? row.id}」？`,
        trigger: () => h(NButton, { quaternary: true, size: 'small', type: 'error' }, { default: () => '删除' }),
      },
    ),
    title: '操作',
    width: 100,
  },
])
const uploadFormModel = computed(() => ({
  uploadFiles: uploadFiles.value,
  uploadType: uploadType.value,
}))

async function load() {
  loading.value = true
  loadingBar.start()
  try {
    data.value = await apiClient.getResource('admin', 'system-file', {
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
      uploadType: uploadTypeFilter.value,
    })
    uploadType.value = uploadTypeOptions.value[0]?.value ?? 'avatar'
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('文件列表加载失败', reason, '文件列表加载失败。')
  }
  finally {
    loading.value = false
  }
}

function handleTopAction(action: ResourceAction) {
  if (action.key === 'upload') {
    uploadFiles.value = []
    uploadOpen.value = true
  }
}

async function submitUpload() {
  try {
    await uploadFormRef.value?.validate()
  }
  catch {
    return
  }

  const files = selectedUploadFiles()
  submitting.value = true
  try {
    const result = await apiClient.uploadSystemFiles(uploadType.value, files)
    message.success(result.message)
    uploadOpen.value = false
    uploadFiles.value = []
    page.value = 1
    await load()
  }
  catch (reason) {
    notifyError('上传失败', reason, '上传失败。')
  }
  finally {
    submitting.value = false
  }
}

async function deleteRow(row: Record<string, unknown>) {
  const id = Number(row.id)
  if (!Number.isInteger(id) || id <= 0) {
    message.error('资源 ID 不正确。')
    return
  }

  submitting.value = true
  try {
    const result = await apiClient.deleteResource('admin', 'system-file', id)
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

function resetAndLoad() {
  page.value = 1
  void load()
}

function selectedUploadFiles() {
  return uploadFiles.value
    .map(file => file.file)
    .filter((file): file is File => file instanceof File)
}

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
            type="primary"
            :loading="submitting"
            @click="handleTopAction(action)"
          >
            <template #icon>
              <AppIcon name="ri:upload-cloud-2-line" />
            </template>
            {{ action.label }}
          </NButton>
        </div>

        <div class="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <NSelect
            v-model:value="uploadTypeFilter"
            :options="uploadTypeFilterOptions"
            size="small"
            style="width: 10rem"
            @update:value="resetAndLoad"
          />
          <NInput
            v-model:value="keyword"
            clearable
            placeholder="文件名 / 存储键 / MIME"
            size="small"
            style="width: 14rem"
            @keyup.enter="resetAndLoad"
          />
          <NButton size="small" type="primary" @click="resetAndLoad">
            <template #icon>
              <AppIcon name="ri:search-line" />
            </template>
            搜索
          </NButton>
        </div>
      </div>
      <NDataTable
        :bordered="false"
        :columns="columns"
        :data="data?.rows ?? []"
        :loading="loading"
        :row-key="row => row.id"
        :scroll-x="1120"
        size="small"
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

  <NModal
    v-model:show="uploadOpen"
    preset="card"
    title="上传文件"
    class="max-w-160"
    :auto-focus="false"
    :closable="!submitting"
    :mask-closable="!submitting"
  >
    <NForm ref="uploadFormRef" label-placement="top" :model="uploadFormModel" :rules="uploadRules" :show-require-mark="false">
      <NFormItem label="上传类型" path="uploadType" required>
        <NSelect v-model:value="uploadType" :options="uploadTypeOptions" />
      </NFormItem>
      <NFormItem label="上传文件" path="uploadFiles" required>
        <Upload v-model:file-list="uploadFiles" :disabled="submitting" />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="submitting" @click="uploadOpen = false">
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="submitUpload">
          确认上传
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
