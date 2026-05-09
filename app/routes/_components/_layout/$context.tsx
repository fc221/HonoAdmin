import type { Child } from 'hono/jsx'
import type { DaisyThemeName, LayoutConfig, ThemeName } from './config'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'hono/jsx'

import {
  defaultLayoutConfig,
  desktopBreakpoint,
  isThemeName,
  layoutConfigStorageKey,
  systemThemeQuery,
} from './config'

type LayoutConfigPatch = Partial<LayoutConfig>

interface LayoutContextValue {
  config: LayoutConfig
  isDesktop: boolean
  updateConfig: (patch: LayoutConfigPatch) => void
  resetConfig: () => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

function createDefaultLayoutConfig(): LayoutConfig {
  return { ...defaultLayoutConfig }
}

function isSameLayoutConfig(
  left: LayoutConfig,
  right: LayoutConfig,
): boolean {
  return (
    left.sidebarCollapsed === right.sidebarCollapsed
    && left.theme === right.theme
  )
}

function normalizeLayoutConfig(
  value: unknown,
  fallback: LayoutConfig,
): LayoutConfig {
  if (!value || typeof value !== 'object') {
    return fallback
  }

  const partialConfig = value as Partial<LayoutConfig>

  return {
    sidebarCollapsed:
      typeof partialConfig.sidebarCollapsed === 'boolean'
        ? partialConfig.sidebarCollapsed
        : fallback.sidebarCollapsed,
    theme: isThemeName(partialConfig.theme)
      ? partialConfig.theme
      : fallback.theme,
  }
}

function readStoredLayoutConfig(): LayoutConfig {
  const fallback = createDefaultLayoutConfig()

  if (typeof localStorage === 'undefined') {
    return fallback
  }

  try {
    const storedConfig = localStorage.getItem(layoutConfigStorageKey)
    if (!storedConfig) {
      return fallback
    }

    return normalizeLayoutConfig(JSON.parse(storedConfig), fallback)
  } catch {
    return fallback
  }
}

function mergeLayoutConfig(
  config: LayoutConfig,
  patch: LayoutConfigPatch,
): LayoutConfig {
  return normalizeLayoutConfig({ ...config, ...patch }, config)
}

function persistLayoutConfig(config: LayoutConfig) {
  try {
    localStorage.setItem(layoutConfigStorageKey, JSON.stringify(config))
  } catch {}
}

function resolveTheme(theme: ThemeName): DaisyThemeName {
  if (theme !== 'system') {
    return theme
  }

  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeName) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
}

function applySidebarCollapsed(sidebarCollapsed: boolean) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.sidebarCollapsed = sidebarCollapsed
    ? 'true'
    : 'false'
}

function isDesktopViewport() {
  if (typeof window === 'undefined') {
    return true
  }

  return window.innerWidth >= desktopBreakpoint
}

export default function LayoutProvider({ children }: { children: Child }) {
  const [config, setConfig] = useState<LayoutConfig>(readStoredLayoutConfig)
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport)

  const updateConfig = useCallback((patch: LayoutConfigPatch) => {
    if (typeof patch.sidebarCollapsed === 'boolean') {
      applySidebarCollapsed(patch.sidebarCollapsed)
    }

    if (patch.theme) {
      applyTheme(patch.theme)
    }

    setConfig((currentConfig) => {
      const nextConfig = mergeLayoutConfig(currentConfig, patch)
      persistLayoutConfig(nextConfig)
      return isSameLayoutConfig(currentConfig, nextConfig)
        ? currentConfig
        : nextConfig
    })
  }, [])

  const resetConfig = useCallback(() => {
    applySidebarCollapsed(defaultLayoutConfig.sidebarCollapsed)
    applyTheme(defaultLayoutConfig.theme)

    setConfig((currentConfig) => {
      const nextConfig = createDefaultLayoutConfig()
      persistLayoutConfig(nextConfig)
      return isSameLayoutConfig(currentConfig, nextConfig)
        ? currentConfig
        : nextConfig
    })
  }, [])

  useEffect(() => {
    const syncDesktopState = () => setIsDesktop(isDesktopViewport())
    const storedConfig = readStoredLayoutConfig()

    setConfig((currentConfig) => {
      return isSameLayoutConfig(currentConfig, storedConfig)
        ? currentConfig
        : storedConfig
    })
    applySidebarCollapsed(storedConfig.sidebarCollapsed)
    applyTheme(storedConfig.theme)
    syncDesktopState()

    window.addEventListener('resize', syncDesktopState)
    return () => {
      window.removeEventListener('resize', syncDesktopState)
    }
  }, [])

  useEffect(() => {
    persistLayoutConfig(config)
    applySidebarCollapsed(config.sidebarCollapsed)
    applyTheme(config.theme)

    if (config.theme !== 'system' || typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(systemThemeQuery)
    const handleSystemThemeChange = () => applyTheme(config.theme)
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () =>
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [config])

  const contextValue = useMemo(
    () => ({
      config,
      isDesktop,
      updateConfig,
      resetConfig,
    }),
    [config, isDesktop, updateConfig, resetConfig],
  )

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayoutContext() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayoutContext 必须在 LayoutProvider 内部使用')
  }
  return context
}
