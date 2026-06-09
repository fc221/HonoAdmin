<script setup lang="ts">
import type { UploadFileInfo } from 'naive-ui'
import { NText, NUpload, NUploadDragger } from 'naive-ui'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  accept?: string
  disabled?: boolean
  fileList: UploadFileInfo[]
  max?: number
  multiple?: boolean
}>(), {
  accept: 'image/gif,image/jpeg,image/png,image/webp',
  disabled: false,
  max: undefined,
  multiple: true,
})

const emit = defineEmits<{
  'update:fileList': [value: UploadFileInfo[]]
}>()

const model = computed({
  get: () => props.fileList,
  set: value => emit('update:fileList', value),
})
</script>

<template>
  <NUpload
    v-model:file-list="model"
    :accept="accept"
    :default-upload="false"
    :disabled="disabled"
    :max="max"
    :multiple="multiple"
  >
    <NUploadDragger>
      <div class="flex min-h-32 flex-col items-center justify-center gap-2">
        <div class="text-sm font-medium">
          点击或拖拽文件到这里
        </div>
        <NText tag="div" depth="3" class="text-xs">
          支持 JPG、PNG、WEBP、GIF
        </NText>
      </div>
    </NUploadDragger>
  </NUpload>
</template>
