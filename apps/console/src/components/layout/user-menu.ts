import type { DropdownOption } from 'naive-ui'
import type { ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { usePageFeedback } from '../../composables/page-feedback'
import { useSessionStore } from '../../stores/session'
import { useThemeStore } from '../../stores/theme'
import AppIcon from '../AppIcon.vue'
import { renderThemeIcon } from './helpers'

/** 顶栏的主题下拉与用户下拉(个人中心/角色切换/退出登录),从 AppLayout 抽出。 */
export function useUserMenu(options: {
  loginPath: ComputedRef<string>
  navigate: (href: string) => void
  refreshPage: () => void
  surface: ComputedRef<'admin' | 'user'>
}) {
  const { loginPath, navigate, refreshPage, surface } = options
  const router = useRouter()
  const { loadingBar, notifyError } = usePageFeedback()
  const themeStore = useThemeStore()
  const sessionStore = useSessionStore()
  const { selectedTheme } = storeToRefs(themeStore)
  const { user } = storeToRefs(sessionStore)

  const userLabel = computed(() => user.value?.nickname || user.value?.username || '用户')
  const themeDropdownOptions = computed<DropdownOption[]>(() =>
    themeStore.themeOptions.map((option) => ({
      icon: renderThemeIcon(option.icon),
      key: option.value,
      label: () => h('span', { class: 'flex min-w-0 items-center justify-between gap-3' }, [
        h('span', { class: 'truncate' }, option.label),
        selectedTheme.value === option.value
          ? h(AppIcon, { class: 'text-primary', name: 'ri:check-line' })
          : null,
      ]),
    })),
  )
  const userDropdownOptions = computed<DropdownOption[]>(() => {
    const roles = user.value?.roles ?? []
    const activeRoleId = user.value?.activeRoleId
    const options: DropdownOption[] = [
      {
        key: 'user-info',
        props: { class: 'pointer-events-none' },
        render: () => h('div', { class: 'flex flex-col px-3 py-2' }, [
          h('div', { class: 'truncate text-sm font-medium text-base-content' }, user.value?.nickname || user.value?.username || '用户'),
          h('div', { class: 'truncate text-xs text-base-muted' }, user.value?.username ?? ''),
        ]),
        type: 'render',
      },
      { key: 'user-info-divider', type: 'divider' },
      {
        icon: () => h(AppIcon, { name: 'ri:user-line' }),
        key: 'profile',
        label: '个人中心',
      },
    ]

    // 个人中心之下再列出角色切换,当前角色打勾且禁用。
    if (roles.length > 1) {
      options.push({
        key: 'role-title',
        props: { class: 'pointer-events-none' },
        render: () => h('div', { class: 'px-3 pt-1 text-xs text-base-muted' }, '切换角色'),
        type: 'render',
      })
      for (const role of roles) {
        const active = role.id === activeRoleId
        options.push({
          disabled: active,
          icon: () => h(AppIcon, {
            class: active ? 'text-primary' : '',
            name: active ? 'ri:check-line' : 'ri:user-shared-2-line',
          }),
          key: `role:${role.id}`,
          label: role.name,
        })
      }
    }

    options.push(
      { key: 'logout-divider', type: 'divider' },
      {
        icon: () => h(AppIcon, { class: 'text-error', name: 'ri:logout-box-r-line' }),
        key: 'logout',
        label: () => h('span', { class: 'text-error' }, '退出登录'),
      },
    )

    return options
  })

  function selectTheme(key: string | number) {
    themeStore.setTheme(key)
  }

  function selectUserAction(key: string | number) {
    const raw = String(key)
    if (raw.startsWith('role:')) {
      switchRole(Number(raw.slice('role:'.length)))
      return
    }
    if (key === 'profile') {
      navigate('/user/profile')
    }
    if (key === 'logout') {
      logout()
    }
  }

  async function logout() {
    loadingBar.start()
    await sessionStore.logout()
    loadingBar.finish()
    await router.replace(loginPath.value)
  }

  async function switchRole(roleId: number) {
    loadingBar.start()
    try {
      const result = await sessionStore.switchRole(roleId)
      const target = typeof result.data?.target === 'string' ? result.data.target : ''
      loadingBar.finish()
      if (target) {
        await router.push(target)
        return
      }
      // 角色切换会清空缓存,这里按当前 surface 再拉一次以恢复菜单/用户。
      await sessionStore.ensureLayout(surface.value)
      refreshPage()
    } catch (reason) {
      loadingBar.error()
      notifyError('操作失败', reason, '角色切换失败。')
    }
  }

  return {
    selectedTheme,
    selectTheme,
    selectUserAction,
    themeDropdownOptions,
    userDropdownOptions,
    userLabel,
  }
}
