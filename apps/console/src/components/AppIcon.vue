<script setup lang="ts">
import type { Component } from 'vue'
import {
  AddOutline,
  AppsOutline,
  ArrowForwardOutline,
  BrowsersOutline,
  CallOutline,
  ChatboxOutline,
  CheckmarkCircleOutline,
  CheckmarkOutline,
  ChevronBackOutline,
  ChevronDownOutline,
  ChevronForwardOutline,
  CloseOutline,
  CloudUploadOutline,
  ColorPaletteOutline,
  ContrastOutline,
  DesktopOutline,
  DocumentsOutline,
  FlashOutline,
  HelpCircleOutline,
  ImageOutline,
  ListOutline,
  LockClosedOutline,
  LogoGithub,
  LogoGoogle,
  MailOutline,
  MenuOutline,
  MoonOutline,
  NotificationsOutline,
  PeopleOutline,
  PersonCircleOutline,
  RefreshOutline,
  SearchOutline,
  SettingsOutline,
  ShieldCheckmarkOutline,
  SunnyOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { computed } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  color?: string
  depth?: 1 | 2 | 3 | 4 | 5
  name: string
  size?: number | string
}>(), {
  color: undefined,
  depth: undefined,
  size: undefined,
})

const iconComponents: Record<string, Component> = {
  'add': AddOutline,
  'arrow-forward': ArrowForwardOutline,
  'black': ContrastOutline,
  'brand': FlashOutline,
  'check': CheckmarkOutline,
  'check-circle': CheckmarkCircleOutline,
  'chevron-back': ChevronBackOutline,
  'chevron-down': ChevronDownOutline,
  'chevron-forward': ChevronForwardOutline,
  'close': CloseOutline,
  'config': SettingsOutline,
  'dashboard': AppsOutline,
  'dark': MoonOutline,
  'feedback': ChatboxOutline,
  'file': ImageOutline,
  'github': LogoGithub,
  'google': LogoGoogle,
  'layout': AppsOutline,
  'light': SunnyOutline,
  'lock': LockClosedOutline,
  'mail': MailOutline,
  'menu-fold': MenuOutline,
  'menu-unfold': MenuOutline,
  'notification': NotificationsOutline,
  'operate-log': ListOutline,
  'page': DocumentsOutline,
  'palette': ColorPaletteOutline,
  'phone': CallOutline,
  'profile': PersonCircleOutline,
  'refresh': RefreshOutline,
  'role': ShieldCheckmarkOutline,
  'search': SearchOutline,
  'settings': SettingsOutline,
  'system': DesktopOutline,
  'time': TimeOutline,
  'update': RefreshOutline,
  'upload': CloudUploadOutline,
  'user-heart': PersonCircleOutline,
  'user-settings': PeopleOutline,
  'web': BrowsersOutline,
}

const iconComponent = computed(() =>
  iconComponents[props.name] ?? HelpCircleOutline,
)
</script>

<template>
  <NIcon v-bind="$attrs" :color="color" :component="iconComponent" :depth="depth" :size="size" />
</template>
