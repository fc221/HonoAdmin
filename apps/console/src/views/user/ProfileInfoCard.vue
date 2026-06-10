<script setup lang="ts">
import { NAvatar, NCard, NDivider, NTag, NText } from 'naive-ui'
import AppIcon from '../../components/AppIcon.vue'

const props = defineProps<{
  user: Record<string, unknown> | null
}>()

function textValue(key: string, fallback = '-') {
  const value = props.user?.[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

function numberValue(key: string) {
  const value = Number(props.user?.[key])
  return Number.isFinite(value) ? value : null
}

function formatDate(value: unknown) {
  const timestamp = Number(value)
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toLocaleString('zh-CN')
    : '-'
}

function genderLabel(value: unknown) {
  if (value === 'male')
    return '男'
  if (value === 'female')
    return '女'
  if (value === 'unknown')
    return '未知'
  return '-'
}

function statusLabel(value: unknown) {
  return value === 'disabled' ? '禁用' : '正常'
}

function avatarText() {
  const value = textValue('nickname', textValue('username', 'U'))
  return value.slice(0, 2).toUpperCase()
}
</script>

<template>
  <NCard>
    <div class="flex flex-col items-center text-center">
      <NAvatar
        round
        :size="80"
        :src="textValue('avatar', '') || undefined"
      >
        {{ avatarText() }}
      </NAvatar>
      <h1 class="mt-4 max-w-full truncate text-xl font-bold">
        {{ textValue('nickname', textValue('username', '用户')) }}
      </h1>
      <NText tag="p" depth="3" class="mt-1 max-w-full truncate font-mono text-sm">
        @{{ textValue('username', '-') }}
      </NText>
      <div class="mt-3 flex flex-wrap justify-center gap-2">
        <NTag :type="textValue('status') === 'disabled' ? 'error' : 'success'" size="small" :bordered="false">
          {{ statusLabel(user?.status) }}
        </NTag>
        <NTag :type="user?.isRoot ? 'error' : 'info'" size="small" :bordered="false">
          {{ user?.isRoot ? 'Root 管理员' : '普通用户' }}
        </NTag>
      </div>
    </div>

    <NDivider class="my-5!" />

    <dl class="space-y-3">
      <div class="flex items-start gap-3 text-sm">
        <AppIcon class="mt-0.5 shrink-0" name="ri:heart-line" />
        <div class="min-w-0 flex-1">
          <NText tag="dt" depth="3" class="text-xs">
            性别
          </NText>
          <dd class="mt-0.5 break-all font-medium">
            {{ genderLabel(user?.gender) }}
          </dd>
        </div>
      </div>
      <div class="flex items-start gap-3 text-sm">
        <AppIcon class="mt-0.5 shrink-0" name="ri:mail-line" />
        <div class="min-w-0 flex-1">
          <NText tag="dt" depth="3" class="text-xs">
            邮箱
          </NText>
          <dd class="mt-0.5 break-all font-medium">
            {{ textValue('mail') }}
          </dd>
        </div>
      </div>
      <div class="flex items-start gap-3 text-sm">
        <AppIcon class="mt-0.5 shrink-0" name="ri:phone-line" />
        <div class="min-w-0 flex-1">
          <NText tag="dt" depth="3" class="text-xs">
            手机
          </NText>
          <dd class="mt-0.5 break-all font-medium">
            {{ textValue('phone') }}
          </dd>
        </div>
      </div>
      <div class="flex items-start gap-3 text-sm">
        <AppIcon class="mt-0.5 shrink-0" name="ri:shield-check-line" />
        <div class="min-w-0 flex-1">
          <NText tag="dt" depth="3" class="text-xs">
            角色
          </NText>
          <dd class="mt-0.5 break-all font-medium">
            {{ numberValue('roleId') ? `#${numberValue('roleId')}` : '-' }}
          </dd>
        </div>
      </div>
      <div class="flex items-start gap-3 text-sm">
        <AppIcon class="mt-0.5 shrink-0" name="ri:time-line" />
        <div class="min-w-0 flex-1">
          <NText tag="dt" depth="3" class="text-xs">
            创建时间
          </NText>
          <dd class="mt-0.5 break-all font-medium">
            {{ formatDate(user?.createdAt) }}
          </dd>
        </div>
      </div>
      <div class="flex items-start gap-3 text-sm">
        <AppIcon class="mt-0.5 shrink-0" name="ri:refresh-line" />
        <div class="min-w-0 flex-1">
          <NText tag="dt" depth="3" class="text-xs">
            更新时间
          </NText>
          <dd class="mt-0.5 break-all font-medium">
            {{ formatDate(user?.updatedAt) }}
          </dd>
        </div>
      </div>
    </dl>

    <NText
      v-if="textValue('bio', '')"
      tag="div"
      depth="3"
      class="mt-5 text-sm leading-6"
    >
      {{ textValue('bio', '') }}
    </NText>
  </NCard>
</template>
