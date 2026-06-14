<script setup lang="ts">
import { darkTheme, NConfigProvider, NDialogProvider, NElement, NLoadingBarProvider, NMessageProvider, NNotificationProvider } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import { useThemeStore } from '../../stores/theme'
import ThemeCssVars from './ThemeCssVars.vue'

const themeStore = useThemeStore()
const { currentThemeOverrides, effectiveTheme, selectedTheme } = storeToRefs(themeStore)
const naiveTheme = computed(() => effectiveTheme.value === 'dark' ? darkTheme : null)

onMounted(() => themeStore.init())
watch([effectiveTheme, selectedTheme], () => themeStore.applyThemeClass())
</script>

<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="currentThemeOverrides">
    <ThemeCssVars />
    <NElement tag="div" class="min-h-screen bg-base-100 text-base-content">
      <NLoadingBarProvider>
        <NMessageProvider>
          <NDialogProvider>
            <NNotificationProvider>
              <slot />
            </NNotificationProvider>
          </NDialogProvider>
        </NMessageProvider>
      </NLoadingBarProvider>
    </NElement>
  </NConfigProvider>
</template>
