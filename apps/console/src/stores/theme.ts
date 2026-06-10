import type { NaiveThemeDraft, NaiveThemeMode } from '../components/theme/naive-theme'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createNaiveThemeDraft,
  createNaiveThemeOverridesFromDraft,
  sanitizeNaiveThemeDraft,
} from '../components/theme/naive-theme'

export const themeOptions = [
  { icon: 'ri:computer-line', label: '系统', value: 'system' },
  { icon: 'ri:sun-line', label: '亮色', value: 'light' },
  { icon: 'ri:moon-line', label: '暗色', value: 'dark' },
  { icon: 'ri:contrast-2-line', label: '纯黑', value: 'black' },
] as const

export type ThemeName = (typeof themeOptions)[number]['value']
type ThemeDrafts = Record<NaiveThemeMode, NaiveThemeDraft>

const canEditThemeDraft = import.meta.env.DEV
let initialized = false

export const useThemeStore = defineStore('theme', () => {
  const selectedTheme = ref<ThemeName>('light')
  const prefersDark = ref(false)
  const themeDrafts = ref<ThemeDrafts>(createDefaultThemeDrafts())
  const effectiveTheme = computed<'dark' | 'light'>(() => {
    if (selectedTheme.value === 'system') {
      return prefersDark.value ? 'dark' : 'light'
    }

    return selectedTheme.value === 'light' ? 'light' : 'dark'
  })
  const currentThemeMode = computed<NaiveThemeMode>(() =>
    selectedTheme.value === 'black' ? 'black' : effectiveTheme.value,
  )
  const currentThemeDraft = computed(() => sanitizeNaiveThemeDraft(
    themeDrafts.value[currentThemeMode.value],
    currentThemeMode.value,
  ))
  const currentThemeOverrides = computed(() =>
    createNaiveThemeOverridesFromDraft(currentThemeDraft.value),
  )

  function init(): void {
    if (typeof window === 'undefined') {
      return
    }

    if (!initialized) {
      initialized = true
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      prefersDark.value = media.matches
      media.addEventListener('change', (event) => {
        prefersDark.value = event.matches
        applyThemeClass()
      })
    }

    normalizeThemeDrafts()
    applyThemeClass()
  }

  function applyThemeClass(): void {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.classList.toggle('dark', effectiveTheme.value === 'dark')
    document.documentElement.dataset.haTheme = selectedTheme.value
  }

  function setTheme(theme: string | number): void {
    if (!isThemeName(theme)) {
      return
    }

    selectedTheme.value = theme
    applyThemeClass()
  }

  function setThemeDraft(mode: NaiveThemeMode, draft: NaiveThemeDraft): void {
    if (!canEditThemeDraft) {
      return
    }

    themeDrafts.value = {
      ...themeDrafts.value,
      [mode]: sanitizeNaiveThemeDraft(draft, mode),
    }
  }

  function resetThemeDraft(mode: NaiveThemeMode): void {
    if (!canEditThemeDraft) {
      return
    }

    setThemeDraft(mode, createNaiveThemeDraft(mode))
  }

  function normalizeThemeDrafts(): void {
    if (!isThemeName(selectedTheme.value)) {
      selectedTheme.value = 'light'
    }

    if (!canEditThemeDraft) {
      themeDrafts.value = createDefaultThemeDrafts()
      return
    }

    themeDrafts.value = {
      black: sanitizeNaiveThemeDraft(themeDrafts.value.black, 'black'),
      dark: sanitizeNaiveThemeDraft(themeDrafts.value.dark, 'dark'),
      light: sanitizeNaiveThemeDraft(themeDrafts.value.light, 'light'),
    }
  }

  return {
    applyThemeClass,
    currentThemeDraft,
    currentThemeMode,
    currentThemeOverrides,
    effectiveTheme,
    init,
    resetThemeDraft,
    selectedTheme,
    setTheme,
    setThemeDraft,
    themeOptions,
    themeDrafts,
  }
}, {
  persist: canEditThemeDraft
    ? {
        pick: ['selectedTheme', 'themeDrafts'],
      }
    : {
        pick: ['selectedTheme'],
      },
})

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string'
    && themeOptions.some((option) => option.value === value)
}

function createDefaultThemeDrafts(): ThemeDrafts {
  return {
    black: createNaiveThemeDraft('black'),
    dark: createNaiveThemeDraft('dark'),
    light: createNaiveThemeDraft('light'),
  }
}
