import type { ComputedRef } from 'vue'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient, ApiClientError } from '../../api/client'
import { usePageFeedback } from '../../composables/page-feedback'
import { useSessionStore } from '../../stores/session'

/** surface(admin/user)切换时的布局拉取与加载/401/428/异常编排,从 AppLayout 抽出。 */
export function useSurfaceSession(options: {
  loginPath: ComputedRef<string>
  surface: ComputedRef<'admin' | 'user'>
}) {
  const { loginPath, surface } = options
  const route = useRoute()
  const router = useRouter()
  const sessionStore = useSessionStore()
  const { loadingBar, notifyError } = usePageFeedback()
  const layoutReady = ref(false)

  async function redirectAfterInstallStateError() {
    const status = await apiClient.installStatus().catch(() => null)
    await router.replace(status?.installed ? '/admin/system/update' : '/install')
  }

  // 仅在 surface(admin/user)切换时拉一次布局,菜单内切换不重拉(ensureLayout 自带缓存)。
  watch(
    surface,
    async (nextSurface) => {
      layoutReady.value = false
      sessionStore.setActiveSurface(nextSurface)
      const requestedPath = route.fullPath
      loadingBar.start()
      try {
        await sessionStore.ensureLayout(nextSurface)
        layoutReady.value = true
        loadingBar.finish()
      } catch (reason) {
        if (reason instanceof ApiClientError && reason.status === 401) {
          loadingBar.finish()
          await router.replace(`${loginPath.value}?${new URLSearchParams({ returnTo: requestedPath })}`)
          return
        }
        if (reason instanceof ApiClientError && reason.status === 428) {
          loadingBar.finish()
          await redirectAfterInstallStateError()
          return
        }

        loadingBar.error()
        notifyError('页面加载失败', reason, '布局加载失败。')
      }
    },
    { immediate: true },
  )

  return { layoutReady }
}
