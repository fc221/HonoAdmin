<script setup lang="ts">
import type { UploadFileInfo } from 'naive-ui'
import { NAvatar, NUpload, NUploadDragger } from 'naive-ui'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  avatar: string
  disabled: boolean
  fileList: UploadFileInfo[]
  initials: string
}>()

const emit = defineEmits<{
  'update:fileList': [value: UploadFileInfo[]]
}>()

const model = computed({
  get: () => props.fileList,
  set: value => emit('update:fileList', value),
})
const imageFailed = ref(false)

watch(() => props.avatar, () => {
  imageFailed.value = false
})

function handleImageError() {
  imageFailed.value = true
}
</script>

<template>
  <div class="avatar-upload">
    <NUpload
      v-model:file-list="model"
      accept="image/gif,image/jpeg,image/png,image/webp"
      :default-upload="false"
      :disabled="disabled"
      :max="1"
      :multiple="false"
      :show-file-list="false"
    >
      <NUploadDragger>
        <div class="avatar-upload__content">
          <NAvatar
            v-if="avatar && !imageFailed"
            round
            :size="80"
            :src="avatar"
            object-fit="cover"
            :on-error="handleImageError"
          />
          <NAvatar v-else round :size="80">
            {{ initials }}
          </NAvatar>
          <div class="avatar-upload__hint">
            点击或拖拽
          </div>
        </div>
      </NUploadDragger>
    </NUpload>
  </div>
</template>

<style scoped>
.avatar-upload {
  width: 80px;
  height: 80px;
}

.avatar-upload :deep(.n-upload-trigger),
.avatar-upload :deep(.n-upload-dragger) {
  width: 80px;
  height: 80px;
}

.avatar-upload :deep(.n-upload-dragger) {
  overflow: hidden;
  border-radius: 9999px;
  padding: 0;
}

.avatar-upload,
.avatar-upload__content,
.avatar-upload :deep(.n-avatar) {
  height: 100%;
}

.avatar-upload :deep(.n-upload-dragger),
.avatar-upload__content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-upload__content {
  width: 100%;
  position: relative;
}

.avatar-upload__hint {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 6px 0;
  background: rgb(15 23 42 / 68%);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  text-align: center;
}
</style>
