<script setup lang="ts">
import type { InstallStatus } from '@hono-admin/server/api/schema'
import type { FormInst, FormRules } from 'naive-ui'
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NStep,
  NSteps,
} from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '../api/client'
import { usePageFeedback } from '../composables/page-feedback'

const { loadingBar, message, notifyError } = usePageFeedback()
const router = useRouter()
const adminFormRef = ref<FormInst | null>(null)
const status = ref<InstallStatus | null>(null)
const loading = ref(false)
const runtimeFormRef = ref<FormInst | null>(null)

const runtimeForm = reactive({
  appTimezone: 'Asia/Shanghai',
  cacheNamespace: 'hono-admin',
  databaseUrl: './hono-admin.sqlite',
  jwtSecret: '',
  sessionSecret: '',
})

const adminForm = reactive({
  confirmPassword: '',
  password: '',
  siteName: 'HonoAdmin',
  username: 'admin',
})
const runtimeRules: FormRules = {
  appTimezone: [{ message: '请输入应用时区', required: true, trigger: ['blur', 'input'] }],
  cacheNamespace: [{ message: '请输入缓存命名空间', required: true, trigger: ['blur', 'input'] }],
  databaseUrl: [{ message: '请输入数据库地址', required: true, trigger: ['blur', 'input'] }],
  jwtSecret: [{ message: '请输入 JWT Secret', required: true, trigger: ['blur', 'input'] }],
  sessionSecret: [{ message: '请输入 Session Secret', required: true, trigger: ['blur', 'input'] }],
}
const adminRules: FormRules = {
  confirmPassword: [{
    message: '两次输入的密码不一致',
    trigger: ['blur', 'input'],
    validator: (_rule, value) => {
      if (!String(value ?? '').trim())
        return false
      return value === adminForm.password
    },
  }],
  password: [{ message: '请输入密码', required: true, trigger: ['blur', 'input'] }],
  siteName: [{ message: '请输入站点名称', required: true, trigger: ['blur', 'input'] }],
  username: [{ message: '请输入管理员账号', required: true, trigger: ['blur', 'input'] }],
}

const currentStep = computed(() => {
  if (!status.value)
    return 1
  if (!status.value.bootstrap.isConfigured)
    return 1
  if (status.value.migration && !status.value.migration.isComplete)
    return 2
  if (!status.value.installed)
    return 3
  return 4
})

async function load() {
  try {
    runtimeForm.jwtSecret ||= generateSecret()
    runtimeForm.sessionSecret ||= generateSecret()
    status.value = await apiClient.installStatus()
    if (status.value.installed) {
      await router.replace(
        status.value.migration && !status.value.migration.isComplete
          ? '/admin/system/update'
          : '/admin/dashboard',
      )
      return
    }

    for (const requirement of status.value.bootstrap.requirements) {
      if (requirement.key === 'DATABASE_URL' && requirement.value)
        runtimeForm.databaseUrl = requirement.value
      if (requirement.key === 'APP_TIMEZONE' && requirement.value)
        runtimeForm.appTimezone = requirement.value
      if (requirement.key === 'CACHE_NAMESPACE' && requirement.value)
        runtimeForm.cacheNamespace = requirement.value
    }
  }
  catch (reason) {
    notifyError('安装状态加载失败', reason, '安装状态加载失败。')
  }
}

function generateSecret() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

async function saveRuntime() {
  try {
    await runtimeFormRef.value?.validate()
  }
  catch {
    return
  }

  await submit(async () => {
    const result = await apiClient.saveRuntimeConfig(runtimeForm)
    message.success(result.message)
    await load()
  })
}

async function migrate() {
  if (status.value?.installed) {
    await goUpdateManagement()
    return
  }

  await submit(async () => {
    const result = await apiClient.runMigrations()
    message.success(result.message)
    await load()
  })
}

async function goUpdateManagement() {
  await router.push({
    path: '/admin/login',
    query: { returnTo: '/admin/system/update' },
  })
}

async function installAdmin() {
  try {
    await adminFormRef.value?.validate()
  }
  catch {
    return
  }

  await submit(async () => {
    const result = await apiClient.installAdmin(adminForm)
    message.success(result.message)
    await router.push('/admin/dashboard')
  })
}

async function submit(action: () => Promise<void>) {
  loading.value = true
  loadingBar.start()
  try {
    await action()
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('操作失败', reason, '操作失败。')
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="min-h-screen px-4 py-10 bg-base-100 text-base-content">
    <section class="mx-auto w-full max-w-3xl">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-primary">
            首次安装
          </p>
          <h1 class="mt-2 text-3xl font-bold">
            初始化 HonoAdmin
          </h1>
          <p class="mt-2 text-sm leading-6 text-base-muted">
            配置运行环境、初始化数据库并创建第一个 root 管理员。
          </p>
        </div>
        <div class="grid size-12 shrink-0 place-items-center rounded-lg text-lg font-bold text-white bg-primary">
          HA
        </div>
      </div>

      <NCard :bordered="false" class="shadow-sm">
        <NSteps :current="currentStep" class="mb-6">
          <NStep title="运行时配置" />
          <NStep title="数据库" />
          <NStep title="管理员" />
        </NSteps>

        <NAlert v-if="status?.installed" type="success" class="mb-4">
          系统已安装完成。
        </NAlert>

        <NForm v-if="currentStep === 1" ref="runtimeFormRef" label-placement="top" :model="runtimeForm" :rules="runtimeRules">
          <div class="grid gap-2 sm:grid-cols-2">
            <NFormItem label="数据库地址" path="databaseUrl">
              <NInput v-model:value="runtimeForm.databaseUrl" />
            </NFormItem>
            <NFormItem label="应用时区" path="appTimezone">
              <NInput v-model:value="runtimeForm.appTimezone" />
            </NFormItem>
            <NFormItem label="缓存命名空间" path="cacheNamespace">
              <NInput v-model:value="runtimeForm.cacheNamespace" />
            </NFormItem>
            <NFormItem label="JWT Secret" path="jwtSecret">
              <NInput v-model:value="runtimeForm.jwtSecret" type="password" />
            </NFormItem>
            <NFormItem label="Session Secret" path="sessionSecret" class="sm:col-span-2">
              <NInput v-model:value="runtimeForm.sessionSecret" type="password" />
            </NFormItem>
          </div>
          <NSpace justify="end">
            <NButton type="primary" :loading="loading" @click="saveRuntime">
              保存配置
            </NButton>
          </NSpace>
        </NForm>

        <div v-else-if="currentStep === 2" class="space-y-4">
          <NAlert v-if="status?.installed" type="warning">
            系统已安装,待执行迁移请登录后台更新管理处理。
          </NAlert>
          <NAlert v-else type="info">
            待执行迁移 {{ status?.migration?.pendingCount ?? 0 }} 个。
          </NAlert>
          <NSpace justify="end">
            <NButton v-if="status?.installed" type="primary" @click="goUpdateManagement">
              前往更新管理
            </NButton>
            <NButton v-else type="primary" :loading="loading" @click="migrate">
              执行迁移
            </NButton>
          </NSpace>
        </div>

        <NForm v-else-if="currentStep === 3" ref="adminFormRef" label-placement="top" :model="adminForm" :rules="adminRules">
          <div class="grid gap-2 sm:grid-cols-2">
            <NFormItem label="站点名称" path="siteName" class="sm:col-span-2">
              <NInput v-model:value="adminForm.siteName" />
            </NFormItem>
            <NFormItem label="管理员账号" path="username">
              <NInput v-model:value="adminForm.username" />
            </NFormItem>
            <NFormItem label="密码" path="password">
              <NInput v-model:value="adminForm.password" type="password" />
            </NFormItem>
            <NFormItem label="确认密码" path="confirmPassword" class="sm:col-span-2">
              <NInput v-model:value="adminForm.confirmPassword" type="password" />
            </NFormItem>
          </div>
          <NSpace justify="end">
            <NButton type="primary" :loading="loading" @click="installAdmin">
              完成安装
            </NButton>
          </NSpace>
        </NForm>

        <NSpace v-else justify="end">
          <NButton type="primary" @click="router.push('/admin/dashboard')">
            进入后台
          </NButton>
        </NSpace>
      </NCard>
    </section>
  </main>
</template>
