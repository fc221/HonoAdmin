import type { LayoutPayload, ResourceMutation } from '@hono-admin/server/api/schema'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiClient } from '../api/client'

export type ConsoleSurface = 'admin' | 'user'

export const useSessionStore = defineStore('session', () => {
  const layout = ref<LayoutPayload | null>(null)
  const loading = ref(false)
  const menus = computed(() => layout.value?.menus ?? [])
  const siteTitle = computed(() => layout.value?.siteTitle ?? 'HonoAdmin')
  const user = computed(() => layout.value?.user ?? null)

  async function loadLayout(surface: ConsoleSurface, activeMenuName: string): Promise<LayoutPayload> {
    loading.value = true
    try {
      layout.value = await apiClient.getLayout(surface, activeMenuName)
      return layout.value
    } finally {
      loading.value = false
    }
  }

  function clearLayout(): void {
    layout.value = null
  }

  async function logout(): Promise<void> {
    await apiClient.logout().catch(() => {})
    clearLayout()
  }

  async function switchRole(roleId: number): Promise<ResourceMutation> {
    const result = await apiClient.switchRole(roleId)
    clearLayout()
    return result
  }

  return {
    clearLayout,
    layout,
    loadLayout,
    loading,
    logout,
    menus,
    siteTitle,
    switchRole,
    user,
  }
})
