<script setup lang="ts">
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { NButton, NInput, NPopover, NTooltip, useMessage } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { apiClient } from '../api/client'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{
  disabled?: boolean
  modelValue?: string
  placeholder?: string
  uploadType?: string
}>(), {
  disabled: false,
  modelValue: '',
  placeholder: '',
  uploadType: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const message = useMessage()
const fileInput = ref<HTMLInputElement | null>(null)
const editorVersion = ref(0)
const linkHref = ref('')
const linkPopoverOpen = ref(false)
const uploading = ref(false)

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [
    StarterKit,
    Link.configure({
      HTMLAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
    }),
    Image.configure({
      allowBase64: false,
    }),
  ],
  onSelectionUpdate: () => {
    editorVersion.value += 1
  },
  onUpdate: ({ editor }) => {
    editorVersion.value += 1
    const html = editor.getHTML()
    emit('update:modelValue', html === '<p></p>' ? '' : html)
  },
})

const canUploadImage = computed(() => Boolean(props.uploadType) && !props.disabled && !uploading.value)

const toolbarButtons = computed(() => {
  void editorVersion.value

  return [{
    active: editor.value?.isActive('heading', { level: 2 }) ?? false,
    key: 'h2',
    label: '二级标题',
    run: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(),
    text: 'H2',
  }, {
    active: editor.value?.isActive('heading', { level: 3 }) ?? false,
    key: 'h3',
    label: '三级标题',
    run: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(),
    text: 'H3',
  }, {
    active: editor.value?.isActive('bold') ?? false,
    key: 'bold',
    label: '粗体',
    run: () => editor.value?.chain().focus().toggleBold().run(),
    text: 'B',
  }, {
    active: editor.value?.isActive('italic') ?? false,
    key: 'italic',
    label: '斜体',
    run: () => editor.value?.chain().focus().toggleItalic().run(),
    text: 'I',
  }, {
    active: editor.value?.isActive('bulletList') ?? false,
    icon: 'ri:list-check-2',
    key: 'bullet-list',
    label: '无序列表',
    run: () => editor.value?.chain().focus().toggleBulletList().run(),
  }, {
    active: editor.value?.isActive('orderedList') ?? false,
    key: 'ordered-list',
    label: '有序列表',
    run: () => editor.value?.chain().focus().toggleOrderedList().run(),
    text: '1.',
  }, {
    active: editor.value?.isActive('blockquote') ?? false,
    key: 'blockquote',
    label: '引用',
    run: () => editor.value?.chain().focus().toggleBlockquote().run(),
    text: '"',
  }]
})

watch(
  () => props.modelValue,
  (value) => {
    const nextValue = value ?? ''
    if (editor.value && editor.value.getHTML() !== (nextValue || '<p></p>')) {
      editor.value.commands.setContent(nextValue, { emitUpdate: false })
    }
  },
)

watch(
  () => props.disabled,
  value => editor.value?.setEditable(!value),
)

onMounted(() => {
  editor.value?.setEditable(!props.disabled)
})

function openLinkPopover() {
  linkHref.value = String(editor.value?.getAttributes('link').href ?? '')
  linkPopoverOpen.value = true
}

function setLink() {
  if (!linkHref.value.trim()) {
    clearLink()
    return
  }

  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: linkHref.value.trim() }).run()
  linkPopoverOpen.value = false
}

function clearLink() {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  linkHref.value = ''
  linkPopoverOpen.value = false
}

function chooseImage() {
  if (canUploadImage.value) {
    fileInput.value?.click()
  }
}

async function uploadImages(files: File[]) {
  if (props.disabled || !files.length || !props.uploadType || !editor.value) {
    return
  }

  uploading.value = true
  try {
    const result = await apiClient.uploadSystemFiles(props.uploadType, files)
    for (const file of extractUploadedFiles(result.data)) {
      editor.value.chain().focus().setImage({
        alt: file.originalName,
        src: file.url,
      }).run()
    }
  }
  catch (reason) {
    message.error(reason instanceof Error ? reason.message : '图片上传失败。')
  }
  finally {
    uploading.value = false
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  void uploadImages(Array.from(input.files ?? []).filter(file => file.type.startsWith('image/')))
  input.value = ''
}

function handleDrop(event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files ?? []).filter(file => file.type.startsWith('image/'))
  if (!files.length) {
    return
  }

  event.preventDefault()
  void uploadImages(files)
}

function handleDragOver(event: DragEvent) {
  if (Array.from(event.dataTransfer?.items ?? []).some(item => item.kind === 'file')) {
    event.preventDefault()
  }
}

function extractUploadedFiles(value: unknown): Array<{ originalName: string, url: string }> {
  if (!value || typeof value !== 'object' || !('files' in value) || !Array.isArray(value.files)) {
    return []
  }

  return value.files.flatMap((file) => {
    if (!file || typeof file !== 'object' || !('url' in file)) {
      return []
    }

    const url = String(file.url ?? '')
    return url
      ? [{ originalName: String('originalName' in file ? file.originalName ?? '' : ''), url }]
      : []
  })
}
</script>

<template>
  <div class="rich-text-editor" :class="{ 'rich-text-editor--disabled': disabled }" @drop="handleDrop" @dragover="handleDragOver">
    <div class="rich-text-editor__toolbar">
      <NTooltip v-for="button in toolbarButtons" :key="button.key" trigger="hover">
        <template #trigger>
          <NButton
            class="rich-text-editor__button"
            size="tiny"
            :aria-label="button.label"
            :disabled="disabled || !editor"
            :type="button.active ? 'primary' : 'default'"
            :secondary="button.active"
            @click="button.run"
          >
            <AppIcon v-if="button.icon" :name="button.icon" />
            <span v-else>{{ button.text }}</span>
          </NButton>
        </template>
        {{ button.label }}
      </NTooltip>

      <span class="rich-text-editor__divider" />

      <NPopover v-model:show="linkPopoverOpen" trigger="manual" placement="bottom-start">
        <template #trigger>
          <NTooltip trigger="hover">
            <template #trigger>
              <NButton aria-label="链接" class="rich-text-editor__button" size="tiny" :disabled="disabled || !editor" @click="openLinkPopover">
                <AppIcon name="ri:global-line" />
              </NButton>
            </template>
            链接
          </NTooltip>
        </template>
        <div class="rich-text-editor__link-panel">
          <NInput v-model:value="linkHref" size="small" placeholder="https://example.com" @keyup.enter="setLink" />
          <div class="rich-text-editor__link-actions">
            <NButton size="tiny" @click="clearLink">
              清除
            </NButton>
            <NButton size="tiny" type="primary" @click="setLink">
              确定
            </NButton>
          </div>
        </div>
      </NPopover>
      <NTooltip trigger="hover">
        <template #trigger>
          <NButton aria-label="插入图片" class="rich-text-editor__button" size="tiny" :disabled="!canUploadImage" :loading="uploading" @click="chooseImage">
            <AppIcon name="ri:image-line" />
          </NButton>
        </template>
        插入图片
      </NTooltip>

      <span class="rich-text-editor__divider" />

      <NTooltip trigger="hover">
        <template #trigger>
          <NButton aria-label="撤销" class="rich-text-editor__button" size="tiny" :disabled="disabled || !editor" @click="editor?.chain().focus().undo().run()">
            <AppIcon name="ri:arrow-left-line" />
          </NButton>
        </template>
        撤销
      </NTooltip>
      <NTooltip trigger="hover">
        <template #trigger>
          <NButton aria-label="重做" class="rich-text-editor__button" size="tiny" :disabled="disabled || !editor" @click="editor?.chain().focus().redo().run()">
            <AppIcon name="ri:arrow-right-line" />
          </NButton>
        </template>
        重做
      </NTooltip>
    </div>

    <EditorContent class="rich-text-editor__content" :aria-label="placeholder || '富文本内容'" :editor="editor" />
    <input ref="fileInput" class="hidden" type="file" accept="image/gif,image/jpeg,image/png,image/webp" multiple @change="handleFileChange">
  </div>
</template>
