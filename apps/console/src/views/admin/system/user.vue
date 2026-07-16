<script setup lang="ts">
import { NSelect, NTag } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { apiClient } from '../../../api/client'
import ResourcePage from '../../../components/ResourcePage.vue'

const selectedRoleId = ref<number | null>(null)
const roleOptions = ref<Array<{ label: string, value: number }>>([])

// 按角色名稳定分配 tag 颜色:同一角色跨行同色,不同角色不同色。
const roleTagTypes = ['info', 'success', 'warning', 'error', 'primary'] as const
function roleTagType(name: string): (typeof roleTagTypes)[number] {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return roleTagTypes[hash % roleTagTypes.length]
}

// 角色筛选下拉的选项:取一次角色列表。角色数量少,一次拉够。
async function loadRoleOptions() {
  const roles = await apiClient.getResource('admin', 'system-role', { page: 1, pageSize: 100 }).catch(() => null)
  roleOptions.value = (roles?.rows ?? []).map(role => ({
    label: String(role.name ?? role.code ?? role.id),
    value: Number(role.id),
  }))
}

// 列表数据由 ResourcePage 自己加载;角色变化经 extraQuery 深监听自动重新加载。
onMounted(() => {
  void loadRoleOptions()
})
</script>

<template>
  <ResourcePage :extra-query="{ roleId: selectedRoleId ?? undefined }">
    <template #filters>
      <NSelect
        v-model:value="selectedRoleId"
        clearable
        :options="roleOptions"
        placeholder="全部角色"
        size="small"
        style="width: min(9rem, 100%)"
      />
    </template>
    <template #cell-id="{ row }">
      <div class="flex flex-col items-start gap-1">
        <div v-if="((row.roleNames as string[] | undefined) ?? []).length" class="flex flex-wrap gap-1">
          <NTag v-for="name in (row.roleNames as string[])" :key="name" :bordered="false" round size="small" :type="roleTagType(name)">
            {{ name }}
          </NTag>
        </div>
        <span class="text-sm">{{ row.id }}</span>
      </div>
    </template>
    <template #cell-status="{ row }">
      <NTag :bordered="false" round size="small" :type="String(row.status) === 'normal' ? 'success' : 'error'">
        {{ String(row.status) === 'normal' ? '正常' : '禁用' }}
      </NTag>
    </template>
  </ResourcePage>
</template>
