<script setup lang="ts">
import type {
  ConfigDefinition,
  ConfigRecord,
  ConfigType,
} from '@hono-admin/server/api/schema'
import type { FormInst } from 'naive-ui'
import {
  NAlert,
  NButton,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
} from 'naive-ui'
import { computed, ref } from 'vue'

interface ConfigFieldRow {
  config: ConfigRecord
  definition?: ConfigDefinition
}

const props = defineProps<{
  activeType: ConfigType
  configs: ConfigRecord[]
  definitions: ConfigDefinition[]
  formValues: Record<string, string>
  label: string
  submitting: boolean
}>()

const emit = defineEmits<{
  reset: []
  submit: []
  updateValue: [configKey: string, value: string]
}>()

const formRef = ref<FormInst | null>(null)
const definitionByKey = computed(() => new Map(
  props.definitions.map(definition => [
    getConfigDefinitionKey(definition.configType, definition.configKey),
    definition,
  ]),
))
const rows = computed<ConfigFieldRow[]>(() =>
  props.configs
    .filter(config => config.configType === props.activeType)
    .map(config => ({
      config,
      definition: definitionByKey.value.get(getConfigDefinitionKey(config.configType, config.configKey)),
    })),
)
const visibleRows = computed(() =>
  rows.value.filter(row => isDefinitionVisible(row.definition)),
)
const fieldRule = {
  max: 4000,
  message: '最多输入 4000 个字符。',
  trigger: ['input', 'blur'],
}

async function submit() {
  await formRef.value?.validate()
  emit('submit')
}

function getConfigDefinitionKey(configType: ConfigType, configKey: string): string {
  return `${configType}:${configKey}`
}

function getFieldLabel(row: ConfigFieldRow): string {
  return row.definition?.label ?? row.config.configKey
}

function getFieldDescription(row: ConfigFieldRow): string {
  return row.definition?.description ?? `配置键：${row.config.configKey}`
}

function isDefinitionVisible(definition: ConfigDefinition | undefined): boolean {
  const rule = definition?.visibleWhen
  if (!rule) {
    return true
  }

  const value = props.formValues[rule.key] ?? ''
  if (rule.equals !== undefined && !normalizeRuleValues(rule.equals).includes(value)) {
    return false
  }

  if (rule.notEquals !== undefined && normalizeRuleValues(rule.notEquals).includes(value)) {
    return false
  }

  return true
}

function normalizeRuleValues(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

function setFieldValue(configKey: string, value: string | number | null) {
  emit('updateValue', configKey, value === null ? '' : String(value))
}

function setNumberValue(configKey: string, value: number | null) {
  emit('updateValue', configKey, value === null ? '' : String(value))
}

function toNumberValue(value: string | undefined): number | null {
  if (value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
</script>

<template>
  <NAlert v-if="!rows.length" type="default">
    暂无{{ label }}配置。
  </NAlert>
  <NForm
    v-else
    ref="formRef"
    :model="formValues"
    label-placement="top"
    require-mark-placement="right-hanging"
    :show-require-mark="false"
  >
    <div class="grid grid-cols-1 gap-4">
      <NFormItem
        v-for="row in visibleRows"
        :key="row.config.id"
        :feedback="getFieldDescription(row)"
        :label="getFieldLabel(row)"
        :path="row.config.configKey"
        :rule="fieldRule"
      >
        <NSelect
          v-if="row.definition?.inputType === 'select' && row.definition.options?.length"
          :value="formValues[row.config.configKey]"
          :options="row.definition.options"
          :placeholder="`请选择${getFieldLabel(row)}`"
          @update:value="value => setFieldValue(row.config.configKey, value)"
        />
        <NInput
          v-else-if="row.definition?.inputType === 'textarea'"
          :value="formValues[row.config.configKey]"
          :autosize="{ minRows: 4, maxRows: 8 }"
          maxlength="4000"
          :placeholder="`请输入${getFieldLabel(row)}`"
          show-count
          type="textarea"
          @update:value="value => setFieldValue(row.config.configKey, value)"
        />
        <NInputNumber
          v-else-if="row.definition?.inputType === 'number'"
          :value="toNumberValue(formValues[row.config.configKey])"
          :placeholder="`请输入${getFieldLabel(row)}`"
          style="width: 100%"
          @update:value="value => setNumberValue(row.config.configKey, value)"
        />
        <NInput
          v-else
          :value="formValues[row.config.configKey]"
          maxlength="4000"
          :placeholder="`请输入${getFieldLabel(row)}`"
          :show-password-on="row.definition?.inputType === 'password' ? 'click' : undefined"
          :type="row.definition?.inputType === 'password' ? 'password' : 'text'"
          @update:value="value => setFieldValue(row.config.configKey, value)"
        />
      </NFormItem>
    </div>

    <NDivider class="my-4!" />
    <div class="flex justify-start gap-2 pb-1">
      <NButton size="small" tertiary :disabled="submitting" @click="emit('reset')">
        还原
      </NButton>
      <NButton size="small" type="primary" :loading="submitting" @click="submit">
        保存配置
      </NButton>
    </div>
  </NForm>
</template>
