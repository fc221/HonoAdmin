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
  NTree,
} from 'naive-ui'
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  fields?: ResourceField[]
  initial?: Record<string, unknown>
  richTextUploadType?: string
  show: boolean
  submitting?: boolean
  title: string
}>(), {
  fields: () => [],
  initial: () => ({}),
  richTextUploadType: '',
  submitting: false,
})

const emit = defineEmits<{
  'cancel': []
  'submit': [value: Record<string, unknown>]
  'update:show': [value: boolean]
}>()

const RichTextEditor = defineAsyncComponent(() => import('./RichTextEditor.vue'))

const form = reactive<Record<string, any>>({})
const formRef = ref<FormInst | null>(null)

const modalShow = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})
const rules = computed<FormRules>(() => {
  const nextRules: FormRules = {}

  for (const field of props.fields) {
    const fieldRules = []

    if (field.required) {
      fieldRules.push({
        message: field.type === 'select' ? `请选择${field.label}` : `请填写${field.label}`,
        trigger: ['blur', 'change', 'input'],
        validator: (_rule: unknown, value: unknown) => hasRequiredValue(value),
      })
    }

    const pattern = field.pattern
    if (pattern) {
      fieldRules.push({
        message: field.patternMessage ?? `${field.label}格式不正确`,
        trigger: ['blur', 'change', 'input'],
        validator: (_rule: unknown, value: unknown) => matchesPattern(value, pattern),
      })
    }

    if (fieldRules.length) {
      nextRules[field.key] = fieldRules
    }
  }

  return nextRules
})
const hasRichText = computed(() => props.fields.some(field => field.type === 'richtext'))

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

function matchesPattern(value: unknown, pattern: string) {
  if (value === null || value === undefined || value === '')
    return true
  if (typeof value !== 'string')
    return false
  return new RegExp(pattern).test(value.trim())
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

// 输入框优先用字段自定义 placeholder,其次把 help 当提示放进去(如「留空则不修改密码」),
// 最后兜底「请输入{标签}」,取代 naive 默认的英文 Please Input。
function inputPlaceholder(field: ResourceField): string {
  return field.placeholder ?? field.help ?? `请输入${field.label}`
}

// 输入类字段没有自定义 placeholder 时,help 已经进了 placeholder,底部不再重复;
// 其它类型(select/tree/switch)无法用 placeholder 承载,help 仍显示在底部。
function bottomHelp(field: ResourceField): string | undefined {
  const inputTypes = ['text', 'password', 'textarea', 'richtext', 'number']
  if (inputTypes.includes(field.type) && !field.placeholder) {
    return undefined
  }
  return field.help
}
</script>

<template>
  <NModal
    v-model:show="modalShow"
    preset="card"
    :title="title"
    :class="hasRichText ? 'max-w-[56rem]' : 'max-w-180'"
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
          :feedback="bottomHelp(field)"
        >
          <NInput
            v-if="field.type === 'text' || field.type === 'password'"
            v-model:value="form[field.key]"
            :placeholder="inputPlaceholder(field)"
            :type="field.type === 'password' ? 'password' : 'text'"
          />
          <NInput
            v-else-if="field.type === 'textarea'"
            v-model:value="form[field.key]"
            :placeholder="inputPlaceholder(field)"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 14 }"
          />
          <RichTextEditor
            v-else-if="field.type === 'richtext'"
            v-model="form[field.key]"
            class="w-full"
            :placeholder="inputPlaceholder(field)"
            :upload-type="richTextUploadType"
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
          <NTree
            v-else-if="field.type === 'tree'"
            v-model:checked-keys="form[field.key]"
            block-line
            cascade
            checkable
            check-strategy="child"
            children-field="children"
            class="max-h-64 w-full overflow-auto rounded-naive border border-base-border p-2"
            :data="field.options ?? []"
            default-expand-all
            key-field="value"
            label-field="label"
            :selectable="false"
          />
          <NSwitch
            v-else-if="field.type === 'switch'"
            v-model:value="form[field.key]"
          />
          <NInputNumber
            v-else-if="field.type === 'number'"
            v-model:value="form[field.key]"
            class="w-full"
            :placeholder="inputPlaceholder(field)"
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
