<script setup lang="ts">
import type {
  ConfigPanelPayload,
  ConfigType,
  ConfigTypeOption,
} from '@hono-admin/server/api/schema'
import { configTypeSchema } from '@hono-admin/server/api/schema'
import {
  NCard,
  NSpin,
  NTabPane,
  NTabs,
  useLoadingBar,
  useMessage,
  useNotification,
} from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '../../../api/client'
import ConfigTypeForm from '../../../components/ConfigTypeForm.vue'

// 面板加载前的占位 tab;真正的列表和白名单都以服务端为准,别在这儿维护第二份。
const defaultConfigTypes: ConfigTypeOption[] = [
  { label: '站点配置', value: 'site' },
  { label: '系统配置', value: 'system' },
  { label: '文件配置', value: 'file' },
  { label: '安全配置', value: 'security' },
]
const configTypes = configTypeSchema.options

const route = useRoute()
const router = useRouter()
const loadingBar = useLoadingBar()
const message = useMessage()
const notification = useNotification()
const loading = ref(false)
const payload = ref<ConfigPanelPayload | null>(null)
const submitting = ref(false)
const baselineValues = ref<Record<string, string>>({})
const formValues = reactive<Record<string, string>>({})

const activeType = computed<ConfigType>({
  get() {
    return parseConfigType(route.query.configType)
  },
  set(value) {
    void router.replace({
      path: route.path,
      query: {
        ...route.query,
        configType: value,
      },
    })
  },
})
const tabOptions = computed(() => payload.value?.types ?? defaultConfigTypes)
const activeTabLabel = computed(() =>
  tabOptions.value.find(option => option.value === activeType.value)?.label ?? '配置',
)
const currentConfigs = computed(() =>
  (payload.value?.configs ?? []).filter(config => config.configType === activeType.value),
)

onMounted(load)

async function load() {
  loading.value = true
  loadingBar.start()

  try {
    const nextPayload = await apiClient.getAdminConfigPanel()
    payload.value = nextPayload
    replaceFormValues(createConfigValueMap(nextPayload))
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('配置加载失败', reason, '配置加载失败。')
  }
  finally {
    loading.value = false
  }
}

async function submitCurrentTab() {
  if (!currentConfigs.value.length) {
    return
  }

  submitting.value = true
  loadingBar.start()

  try {
    const values = Object.fromEntries(
      currentConfigs.value.map(config => [
        config.configKey,
        formValues[config.configKey] ?? '',
      ]),
    )
    const result = await apiClient.updateAdminConfigValues({
      configType: activeType.value,
      values,
    })
    message.success(result.message)
    await load()
    loadingBar.finish()
  }
  catch (reason) {
    loadingBar.error()
    notifyError('保存失败', reason, '保存失败。')
  }
  finally {
    submitting.value = false
  }
}

function resetFormValues() {
  replaceFormValues(baselineValues.value)
}

function replaceFormValues(values: Record<string, string>) {
  for (const key of Object.keys(formValues)) {
    delete formValues[key]
  }

  for (const [key, value] of Object.entries(values)) {
    formValues[key] = value
  }

  baselineValues.value = { ...values }
}

function createConfigValueMap(panel: ConfigPanelPayload): Record<string, string> {
  const values = Object.fromEntries(
    panel.definitions.map(definition => [
      definition.configKey,
      definition.configValue,
    ]),
  )

  for (const config of panel.configs) {
    values[config.configKey] = config.configValue
  }

  return values
}

function parseConfigType(value: unknown): ConfigType {
  return typeof value === 'string' && configTypes.includes(value as ConfigType)
    ? value as ConfigType
    : 'site'
}

function setFieldValue(configKey: string, value: string) {
  formValues[configKey] = value
}

function notifyError(title: string, reason: unknown, fallback: string) {
  notification.error({
    content: reason instanceof Error ? reason.message : fallback,
    duration: 4500,
    title,
  })
}
</script>

<template>
  <NCard class="overflow-hidden">
    <NSpin :show="loading && !payload">
      <NTabs v-model:value="activeType" type="line" animated pane-class="pt-3">
        <NTabPane
          v-for="option in tabOptions"
          :key="option.value"
          :name="option.value"
          :tab="option.label"
        >
          <ConfigTypeForm
            v-if="activeType === option.value && payload"
            :active-type="activeType"
            :configs="payload.configs"
            :definitions="payload.definitions"
            :form-values="formValues"
            :label="activeTabLabel"
            :submitting="submitting"
            @reset="resetFormValues"
            @submit="submitCurrentTab"
            @update-value="setFieldValue"
          />
        </NTabPane>
      </NTabs>
    </NSpin>
  </NCard>
</template>
