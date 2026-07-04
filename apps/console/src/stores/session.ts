import type { LayoutPayload, ResourceMutation } from '@hono-admin/server/api/schema'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiClient } from '../api/client'

export type ConsoleSurface = 'admin' | 'user'

export const useSessionStore = defineStore('session', () => {
  const layouts = ref<Record<ConsoleSurface, LayoutPayload | null>>({ admin: null, user: null })
  const activeSurface = ref<ConsoleSurface>('admin')
  const loading = ref(false)

  const layout = computed(() => layouts.value[activeSurface.value])
  const menus = computed(() => layout.value?.menus ?? [])
  const siteTitle = computed(() => layout.value?.siteTitle ?? 'HonoAdmin')
  const user = computed(() => layout.value?.user ?? null)

  function setActiveSurface(surface: ConsoleSurface): void {
    activeSurface.value = surface
  }

  async function ensureLayout(surface: ConsoleSurface): Promise<LayoutPayload> {
    const cached = layouts.value[surface]
    if (cached) {
      return cached
    }

    loading.value = true
    try {
      const data = await apiClient.getLayout(surface)
      layouts.value[surface] = data
      return data
    } finally {
      loading.value = false
    }
  }

  function clearLayout(): void {
    layouts.value = { admin: null, user: null }
  }

  async function logout(): Promise<void> {
    await apiClient.logout().catch(() => {})
    clearLayout()
  }

  async function switchRole(roleId: number): Promise<ResourceMutation> {
    const result = await apiClient.switchRole(roleId)
    clearLayout()
    const target = typeof result.data?.target === 'string' ? result.data.target : ''
    const nextSurface = target.startsWith('/user')
      ? 'user'
      : target.startsWith('/admin') ? 'admin' : activeSurface.value
    activeSurface.value = nextSurface
    await ensureLayout(nextSurface)
    return result
  }

  return {
    activeSurface,
    clearLayout,
    ensureLayout,
    layout,
    loading,
    logout,
    menus,
    setActiveSurface,
    siteTitle,
    switchRole,
    user,
  }
})
