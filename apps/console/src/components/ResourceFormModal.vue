<script setup lang="ts">
import type { ResourceField } from '@hono-admin/server/api/schema'
import type { FormInst, FormRules } from 'naive-ui'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
} from 'naive-ui'
import { computed, reactive, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  fields?: ResourceField[]
  initial?: Record<string, unknown>
  show: boolean
  submitting?: boolean
  title: string
}>(), {
  fields: () => [],
  initial: () => ({}),
  submitting: false,
})

const emit = defineEmits<{
  'cancel': []
  'submit': [value: Record<string, unknown>]
  'update:show': [value: boolean]
}>()

const form = reactive<Record<string, any>>({})
const formRef = ref<FormInst | null>(null)

const modalShow = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})
const rules = computed<FormRules>(() => {
  const nextRules: FormRules = {}

  for (const field of props.fields) {
    if (!field.required)
      continue

    nextRules[field.key] = [{
      message: field.type === 'select' ? `请选择${field.label}` : `请填写${field.label}`,
      trigger: ['blur', 'change', 'input'],
      validator: (_rule, value) => hasRequiredValue(value),
    }]
  }

  return nextRules
})

watch(
  () => [props.show, props.fields, props.initial] as const,
  () => {
    if (!props.show)
      return

    for (const key of Object.keys(form)) {
      delete form[key]
    }

    for (const field of props.fields) {
      form[field.key] = props.initial[field.key] ?? field.defaultValue ?? defaultFieldValue(field)
    }
  },
  { immediate: true },
)

function defaultFieldValue(field: ResourceField) {
  if (field.multiple)
    return []
  if (field.type === 'switch')
    return false
  if (field.type === 'number')
    return null
  return ''
}

function hasRequiredValue(value: unknown) {
  if (Array.isArray(value))
    return value.length > 0
  if (typeof value === 'string')
    return value.trim().length > 0
  return value !== null && value !== undefined && value !== ''
}

async function submit() {
  try {
    await formRef.value?.validate()
  }
  catch {
    return
  }
  emit('submit', { ...form })
}
</script>

<template>
  <NModal
    v-model:show="modalShow"
    preset="card"
    :title="title"
    class="max-w-180"
    :auto-focus="false"
    :mask-closable="!submitting"
    :closable="!submitting"
  >
    <NForm ref="formRef" label-placement="top" :model="form" :rules="rules" :show-require-mark="false">
      <div class="grid gap-1 sm:grid-cols-2">
        <NFormItem
          v-for="field in fields"
          :key="field.key"
          :label="field.label"
          :path="field.key"
          :class="field.type === 'textarea' || field.type === 'richtext' ? 'sm:col-span-2' : ''"
          :required="field.required"
          :feedback="field.help"
        >
          <NInput
            v-if="field.type === 'text' || field.type === 'password'"
            v-model:value="form[field.key]"
            :placeholder="field.placeholder"
            :type="field.type === 'password' ? 'password' : 'text'"
          />
          <NInput
            v-else-if="field.type === 'textarea' || field.type === 'richtext'"
            v-model:value="form[field.key]"
            :placeholder="field.placeholder"
            type="textarea"
            :autosize="{ minRows: field.type === 'richtext' ? 8 : 4, maxRows: 14 }"
          />
          <NSelect
            v-else-if="field.type === 'select'"
            v-model:value="form[field.key]"
            :multiple="field.multiple"
            :options="field.options ?? []"
            :placeholder="field.placeholder ?? '请选择'"
            clearable
            filterable
          />
          <NSwitch
            v-else-if="field.type === 'switch'"
            v-model:value="form[field.key]"
          />
          <NInputNumber
            v-else-if="field.type === 'number'"
            v-model:value="form[field.key]"
            class="w-full"
            :placeholder="field.placeholder"
          />
          <NInput
            v-else
            :value="String(form[field.key] ?? '')"
            readonly
          />
        </NFormItem>
      </div>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="submitting" @click="$emit('cancel')">
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="submit">
          保存
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
