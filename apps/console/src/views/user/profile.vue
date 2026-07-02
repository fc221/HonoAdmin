<script setup lang="ts">
import type { ResourceList, UserProfile } from '@hono-admin/server/api/schema'
import type { FormInst, FormRules, UploadFileInfo } from 'naive-ui'
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NPagination,
  NSelect,
  NTabPane,
  NTabs,
  useLoadingBar,
  useMessage,
  useNotification,
} from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { apiClient } from '../../api/client'
import DataTable from '../../components/DataTable.vue'
import AvatarUpload from './AvatarUpload.vue'
import ProfileInfoCard from './ProfileInfoCard.vue'

const message = useMessage()
const loadingBar = useLoadingBar()
const notification = useNotification()
const avatarFiles = ref<UploadFileInfo[]>([])
const page = ref(1)
const pageSize = ref(10)
const passwordFormRef = ref<FormInst | null>(null)
const profileFormRef = ref<FormInst | null>(null)
const profileLogs = ref<ResourceList | null>(null)
const session = ref<UserProfile | null>(null)
const submitting = ref(false)
const userDetail = ref<Record<string, unknown> | null>(null)

const profileForm = reactive({
  avatar: '',
  bio: '',
  gender: null as null | string,
  nickname: '',
  username: '',
})
const passwordForm = reactive({
  confirmPassword: '',
  oldPassword: '',
  password: '',
})
const profileRules: FormRules = {
  username: [{ message: '请输入用户名', required: true, trigger: ['blur', 'input'] }],
}
const passwordRules: FormRules = {
  confirmPassword: [{
    message: '请确认新密码',
    trigger: ['blur', 'input'],
    validator: (_rule, value) => {
      if (!String(value ?? '').trim())
        return false
      return value === passwordForm.password
    },
  }],
  oldPassword: [{ message: '请输入旧密码', required: true, trigger: ['blur', 'input'] }],
  password: [{ message: '请输入新密码', required: true, trigger: ['blur', 'input'] }],
}

const genderOptions = [
  { label: '保密', value: '' },
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '未知', value: 'unknown' },
]
const avatarInitials = computed(() => {
  const source = profileForm.nickname || profileForm.username || session.value?.username || 'U'
  return source.trim().slice(0, 2).toUpperCase()
})

async function load() {
  loadingBar.start()
  try {
    profileLogs.value = await apiClient.getResource('user', 'profile', {
      page: page.value,
      pageSize: pageSize.value,
    })
    session.value = await apiClient.session()
    if (session.value) {
      const detail = await apiClient.getResourceDetail('user', 'profile', session.value.id)
      applyProfile(detail.data)
    }
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('个人中心加载失败', reason, '个人中心加载失败。')
  }
}

function applyProfile(data: Record<string, unknown>) {
  userDetail.value = data
  profileForm.avatar = stringValue(data.avatar)
  profileForm.bio = stringValue(data.bio)
  profileForm.gender = stringValue(data.gender) || null
  profileForm.nickname = stringValue(data.nickname)
  profileForm.username = stringValue(data.username)
}

async function handleAvatarFilesChange(files: UploadFileInfo[]) {
  avatarFiles.value = files
  const file = selectedAvatarFile()

  if (!file) {
    return
  }

  if (!session.value) {
    message.warning('请先登录。')
    avatarFiles.value = []
    return
  }

  submitting.value = true
  try {
    const result = await apiClient.uploadProfileAvatar(file)
    if (typeof result.data?.avatar === 'string') {
      profileForm.avatar = result.data.avatar
    }
    message.success(result.message)
    avatarFiles.value = []
    await load()
  }
  catch (reason) {
    notifyError('头像上传失败', reason, '头像上传失败。')
  }
  finally {
    submitting.value = false
  }
}

async function saveProfile() {
  try {
    await profileFormRef.value?.validate()
  }
  catch {
    return
  }

  if (!session.value) {
    message.warning('请先登录。')
    return
  }

  submitting.value = true
  try {
    const result = await apiClient.updateResource('user', 'profile', session.value.id, {
      avatar: profileForm.avatar,
      bio: profileForm.bio,
      gender: profileForm.gender || null,
      nickname: profileForm.nickname,
      username: profileForm.username,
    })
    message.success(result.message)
    await load()
  }
  catch (reason) {
    notifyError('保存失败', reason, '保存失败。')
  }
  finally {
    submitting.value = false
  }
}

async function savePassword() {
  try {
    await passwordFormRef.value?.validate()
  }
  catch {
    return
  }

  submitting.value = true
  try {
    const result = await apiClient.updateProfilePassword(passwordForm)
    message.success(result.message)
    passwordForm.oldPassword = ''
    passwordForm.password = ''
    passwordForm.confirmPassword = ''
  }
  catch (reason) {
    notifyError('密码修改失败', reason, '密码修改失败。')
  }
  finally {
    submitting.value = false
  }
}

function resetAndLoad() {
  page.value = 1
  void load()
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function selectedAvatarFile() {
  return avatarFiles.value
    .map(file => file.file)
    .find((file): file is File => file instanceof File)
}

function notifyError(title: string, reason: unknown, fallback: string) {
  notification.error({
    content: reason instanceof Error ? reason.message : fallback,
    duration: 4500,
    title,
  })
}

onMounted(load)
</script>

<template>
  <div class="flex min-w-0 flex-col items-stretch gap-4 lg:flex-row lg:items-start">
    <aside class="w-full lg:sticky lg:top-0 lg:w-72 lg:shrink-0 lg:self-start">
      <ProfileInfoCard :user="userDetail" />
    </aside>

    <section class="min-w-0 flex-1">
      <NCard>
        <NTabs type="line" animated>
          <NTabPane name="profile" tab="信息编辑">
            <NForm ref="profileFormRef" class="max-w-2xl" label-placement="top" :model="profileForm" :rules="profileRules" :show-require-mark="false">
              <NFormItem label="上传头像">
                <AvatarUpload
                  :avatar="profileForm.avatar"
                  :disabled="submitting"
                  :file-list="avatarFiles"
                  :initials="avatarInitials"
                  @update:file-list="handleAvatarFilesChange"
                />
              </NFormItem>
              <NFormItem label="昵称">
                <NInput v-model:value="profileForm.nickname" placeholder="用户昵称" maxlength="80" />
              </NFormItem>
              <NFormItem label="用户名" path="username" required>
                <NInput v-model:value="profileForm.username" placeholder="请输入用户名" maxlength="40" />
              </NFormItem>
              <NFormItem label="性别">
                <NSelect v-model:value="profileForm.gender" :options="genderOptions" />
              </NFormItem>
              <NFormItem label="简介">
                <NInput v-model:value="profileForm.bio" type="textarea" placeholder="介绍一下自己" maxlength="500" :autosize="{ minRows: 4, maxRows: 8 }" />
              </NFormItem>
              <NButton type="primary" size="small" :loading="submitting" :disabled="!session" @click="saveProfile">
                保存资料
              </NButton>
            </NForm>
          </NTabPane>

          <NTabPane name="password" tab="密码修改">
            <NForm ref="passwordFormRef" class="max-w-2xl" label-placement="top" :model="passwordForm" :rules="passwordRules" :show-require-mark="false">
              <NFormItem label="旧密码" path="oldPassword" required>
                <NInput v-model:value="passwordForm.oldPassword" autocomplete="current-password" type="password" show-password-on="click" placeholder="请输入旧密码" />
              </NFormItem>
              <NFormItem label="新密码" path="password" required>
                <NInput v-model:value="passwordForm.password" autocomplete="new-password" type="password" show-password-on="click" placeholder="请输入新密码" maxlength="128" />
              </NFormItem>
              <NFormItem label="确认新密码" path="confirmPassword" required>
                <NInput v-model:value="passwordForm.confirmPassword" autocomplete="new-password" type="password" show-password-on="click" placeholder="请确认新密码" maxlength="128" />
              </NFormItem>
              <NButton type="primary" size="small" :loading="submitting" :disabled="!session" @click="savePassword">
                保存密码
              </NButton>
            </NForm>
          </NTabPane>

          <NTabPane name="logs" tab="操作日志">
            <div class="space-y-4">
              <DataTable :data="profileLogs" />
              <div class="flex justify-end">
                <NPagination
                  v-model:page="page"
                  v-model:page-size="pageSize"
                  :item-count="profileLogs?.pagination.total ?? 0"
                  :page-sizes="[10, 20, 50]"
                  show-size-picker
                  @update:page="load"
                  @update:page-size="resetAndLoad"
                />
              </div>
            </div>
          </NTabPane>
        </NTabs>
      </NCard>
    </section>
  </div>
</template>
