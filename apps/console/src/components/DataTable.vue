<script setup lang="ts">
import type { ResourceAction, ResourceList } from '@hono-admin/server/api/schema'
import { NButton, NCard, NDataTable, NEmpty, NPopconfirm, NSpace } from 'naive-ui'
import { computed, h } from 'vue'

const props = withDefaults(defineProps<{
  data?: ResourceList | null
  framed?: boolean
  loading?: boolean
  rowActions?: ResourceAction[]
}>(), {
  data: null,
  framed: true,
  loading: false,
  rowActions: () => [],
})

const emit = defineEmits<{
  rowAction: [action: ResourceAction, row: Record<string, unknown>]
}>()

const columns = computed(() =>
  [
    ...(props.data?.columns.map(column => ({
      key: column.key,
      title: column.title,
      width: column.width,
    })) ?? []),
    ...(props.rowActions.length
      ? [{
          fixed: 'right' as const,
          key: '__actions',
          render: (row: Record<string, unknown>) => hActions(row),
          title: '操作',
          width: 150,
        }]
      : []),
  ],
)

function hActions(row: Record<string, unknown>) {
  return h(
    NSpace,
    { size: 'small', wrap: false },
    {
      default: () => props.rowActions.map(action =>
        action.key === 'delete'
          ? h(
              NPopconfirm,
              {
                key: action.key,
                onPositiveClick: () => emit('rowAction', action, row),
              },
              {
                default: () => `确认${action.label}？`,
                trigger: () => h(NButton, { quaternary: true, size: 'small', type: 'error' }, { default: () => action.label }),
              },
            )
          : h(
              NButton,
              {
                key: action.key,
                quaternary: true,
                size: 'small',
                type: action.danger ? 'error' : 'primary',
                onClick: () => emit('rowAction', action, row),
              },
              { default: () => action.label },
            ),
      ),
    },
  )
}
</script>

<template>
  <NCard v-if="framed">
    <template #header>
      <span class="text-sm font-semibold">{{ data?.title ?? '列表' }}</span>
    </template>
    <NDataTable
      :bordered="false"
      :columns="columns"
      :data="data?.rows ?? []"
      :loading="loading"
      :scroll-x="900"
      size="small"
    >
      <template #empty>
        <NEmpty description="暂无数据" />
      </template>
    </NDataTable>
  </NCard>
  <div v-else>
    <NDataTable
      :bordered="false"
      :columns="columns"
      :data="data?.rows ?? []"
      :loading="loading"
      :scroll-x="900"
      size="small"
    >
      <template #empty>
        <NEmpty description="暂无数据" />
      </template>
    </NDataTable>
  </div>
</template>
