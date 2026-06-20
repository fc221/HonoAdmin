import type {
  LayoutMainWidth,
  LayoutSidebarStyle,
  LayoutVariant,
} from '../components/layout/layout-config'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  buildLayoutConfigSnippet,
  defaultLayoutConfig,
  hasCollapsibleSidebarVariant,
  isHybridVariant,
  isLayoutMainWidth,
  isLayoutSidebarStyle,
  isLayoutVariant,
  isTopNavVariant,
  layoutConfigStorageKey,
} from '../components/layout/layout-config'

const canEditInterface = import.meta.env.DEV

export const useLayoutStore = defineStore('layout', () => {
  const variant = ref<LayoutVariant>(defaultLayoutConfig.variant)
  const mainWidth = ref<LayoutMainWidth>(defaultLayoutConfig.mainWidth)
  const sidebarCollapsed = ref(defaultLayoutConfig.sidebarCollapsed)
  const sidebarStyle = ref<LayoutSidebarStyle>(defaultLayoutConfig.sidebarStyle)
  const topMenuCentered = ref(defaultLayoutConfig.topMenuCentered)

  const config = computed(() => ({
    mainWidth: mainWidth.value,
    sidebarCollapsed: sidebarCollapsed.value,
    sidebarStyle: sidebarStyle.value,
    topMenuCentered: topMenuCentered.value,
    variant: variant.value,
  }))
  const canCollapseSidebar = computed(() => hasCollapsibleSidebarVariant(variant.value))
  // 仅"有桌面侧栏"的变体(侧边栏 / 综合)可调侧栏样式;顶部导航(顶栏/顶部贴边)无桌面侧栏,禁用。
  const canUseSidebarStyle = computed(() => hasCollapsibleSidebarVariant(variant.value))
  const canUseTopNavOptions = computed(() => isTopNavVariant(variant.value))
  const layoutConfigSnippet = computed(() => buildLayoutConfigSnippet(config.value))

  function setVariant(value: string | number): void {
    if (!canEditInterface) {
      return
    }

    if (!isLayoutVariant(value)) {
      return
    }

    variant.value = value
    if (isHybridVariant(value)) {
      mainWidth.value = 'wide'
      topMenuCentered.value = false
    }
  }

  function setMainWidth(value: LayoutMainWidth): void {
    if (!canEditInterface) {
      return
    }

    if (isLayoutMainWidth(value)) {
      mainWidth.value = value
    }
  }

  function setSidebarCollapsed(value: boolean): void {
    if (canCollapseSidebar.value) {
      sidebarCollapsed.value = value
    }
  }

  function setSidebarStyle(value: string | number): void {
    if (!canEditInterface) {
      return
    }

    if (isLayoutSidebarStyle(value) && canUseSidebarStyle.value) {
      sidebarStyle.value = value
    }
  }

  function setTopMenuCentered(value: boolean): void {
    if (!canEditInterface) {
      return
    }

    if (canUseTopNavOptions.value) {
      topMenuCentered.value = value
    }
  }

  function normalizeForConsole(): void {
    if (!canEditInterface) {
      mainWidth.value = defaultLayoutConfig.mainWidth
      sidebarStyle.value = defaultLayoutConfig.sidebarStyle
      topMenuCentered.value = defaultLayoutConfig.topMenuCentered
      variant.value = defaultLayoutConfig.variant
      return
    }

    if (!isLayoutVariant(variant.value)) {
      variant.value = defaultLayoutConfig.variant
    }

    if (isHybridVariant(variant.value)) {
      mainWidth.value = 'wide'
      topMenuCentered.value = false
    }
  }

  return {
    canCollapseSidebar,
    canUseSidebarStyle,
    canUseTopNavOptions,
    config,
    layoutConfigSnippet,
    mainWidth,
    normalizeForConsole,
    setMainWidth,
    setSidebarCollapsed,
    setSidebarStyle,
    setTopMenuCentered,
    setVariant,
    sidebarCollapsed,
    sidebarStyle,
    topMenuCentered,
    variant,
  }
}, {
  persist: canEditInterface
    ? {
        key: layoutConfigStorageKey,
        pick: [
          'mainWidth',
          'sidebarCollapsed',
          'sidebarStyle',
          'topMenuCentered',
          'variant',
        ],
      }
    : false,
})
