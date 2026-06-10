<script setup lang="ts">
import type { NaiveThemeDraft, NaiveThemeMode } from '../../theme/naive-theme'
import { NButton, NDrawer, NDrawerContent, useMessage, useThemeVars } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useLayoutStore } from '../../../stores/layout'
import { useThemeStore } from '../../../stores/theme'
import AppIcon from '../../AppIcon.vue'
import {
  buildNaiveThemeOverridesSnippetFromDraft,
} from '../../theme/naive-theme'
import SettingsLayoutSection from './SettingsLayoutSection.vue'
import SettingsPreferencesSection from './SettingsPreferencesSection.vue'
import SettingsThemeSelectSection from './SettingsThemeSelectSection.vue'
import SettingsThemeStyleSection from './SettingsThemeStyleSection.vue'

const isDev = import.meta.env.DEV
const show = ref(false)
const layoutStore = useLayoutStore()
const themeStore = useThemeStore()
const themeVars = useThemeVars()
const { effectiveTheme, selectedTheme } = storeToRefs(themeStore)
const message = useMessage()
const layoutCopyLabel = ref('复制 layout config')
const styleCopyLabel = ref('复制 UI 样式 JS')
let copyResetTimer = 0

const currentThemeMode = computed<NaiveThemeMode>(() =>
  selectedTheme.value === 'black' ? 'black' : effectiveTheme.value,
)
const themeDraft = computed<NaiveThemeDraft>({
  get: () => themeStore.currentThemeDraft,
  set: draft => themeStore.setThemeDraft(currentThemeMode.value, draft),
})

function openDrawer(): void {
  show.value = true
}

async function copyLayoutConfig(): Promise<void> {
  await copyText(layoutStore.layoutConfigSnippet, layoutCopyLabel, '复制 layout config')
}

async function copyUiStyle(): Promise<void> {
  await copyText(buildNaiveThemeOverridesSnippetFromDraft(themeDraft.value), styleCopyLabel, '复制 UI 样式 JS')
}

async function copyText(text: string, label: typeof layoutCopyLabel, defaultLabel: string): Promise<void> {
  try {
    await writeClipboardText(text)
    label.value = '已复制!'
    message.success('已复制')
  }
  catch {
    label.value = '复制失败'
    message.error('复制失败')
  }

  if (copyResetTimer) {
    window.clearTimeout(copyResetTimer)
  }
  copyResetTimer = window.setTimeout(() => {
    label.value = defaultLabel
  }, 1500)
}

async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    }
    catch {}
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto 0'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('copy failed')
  }
}
</script>

<template>
  <template v-if="isDev">
    <AppIcon class="cursor-pointer" name="ri:settings-3-line" title="设置" aria-label="打开设置面板" @click="openDrawer" />

    <NDrawer v-model:show="show" width="min(384px, calc(100vw - 36px))" placement="right">
      <NDrawerContent closable title="界面设置" :native-scrollbar="false">
        <div class="space-y-6">
          <SettingsThemeSelectSection />
          <SettingsLayoutSection />
          <SettingsPreferencesSection />
          <SettingsThemeStyleSection v-model:draft="themeDraft" :mode="currentThemeMode" />
        </div>

        <template #footer>
          <div
            class="grid grid-cols-2 overflow-hidden border"
            :style="{ borderColor: themeVars.borderColor, borderRadius: themeVars.borderRadiusSmall }"
          >
            <NButton quaternary class="rounded-none!" @click="copyLayoutConfig">
              <template #icon>
                <AppIcon name="ri:layout-grid-line" />
              </template>
              {{ layoutCopyLabel }}
            </NButton>
            <NButton quaternary class="rounded-none!" @click="copyUiStyle">
              <template #icon>
                <AppIcon name="ri:palette-line" />
              </template>
              {{ styleCopyLabel }}
            </NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>
  </template>
</template>
