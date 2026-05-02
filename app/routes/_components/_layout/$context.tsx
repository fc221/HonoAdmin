import {
  Child,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'hono/jsx'

export interface LayoutConfig {
  theme: ThemeName // 主题
}

export const themeNames = ['system', 'light', 'dark', 'black'] as const

export type ThemeName = (typeof themeNames)[number]

type DaisyThemeName = Exclude<ThemeName, 'system'>

// 默认配置
const defaultConfig: LayoutConfig = {
  theme: 'light',
}

// 定义上下文类型
interface LayoutContextType {
  config: LayoutConfig
  isDesktop: boolean // 是否为桌面端
  isReady: boolean
  updateConfig: (newConfig: Partial<LayoutConfig>) => void // 支持部分更新
  resetConfig: () => void // 重置为默认
}

const LayoutContext = createContext<LayoutContextType | null>(null)

const layoutConfigStorageKey = 'layout-config'
const legacyConfigStorageKey = 'app-config'
const systemThemeQuery = '(prefers-color-scheme: dark)'

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && themeNames.includes(value as ThemeName)
}

function resolveTheme(theme: ThemeName): DaisyThemeName {
  if (theme !== 'system') {
    return theme
  }

  return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light'
}

function persistLayoutConfig(config: LayoutConfig) {
  localStorage.setItem(layoutConfigStorageKey, JSON.stringify(config))
  localStorage.removeItem(legacyConfigStorageKey)
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
}

export default function LayoutProvider({ children }: { children: Child }) {
  const [config, setConfig] = useState<LayoutConfig>(defaultConfig)
  const [isDesktop, setIsDesktop] = useState(true)
  const [isReady, setIsReady] = useState(false)

  const updateConfig = (newConfig: Partial<LayoutConfig>) => {
    const hasChanges = Object.entries(newConfig).some(
      ([k, v]) => config[k as keyof LayoutConfig] !== v,
    )

    if (!hasChanges) {
      return
    }

    const nextConfig = { ...config, ...newConfig }
    persistLayoutConfig(nextConfig)
    applyTheme(nextConfig.theme)
    setConfig(nextConfig)
  }

  const resetConfig = () => {
    setConfig({ ...defaultConfig })
  }

  useEffect(() => {
    let nextConfig: LayoutConfig = { ...defaultConfig }

    // 从 localStorage 加载配置
    const storedConfig
      = localStorage.getItem(layoutConfigStorageKey)
        ?? localStorage.getItem(legacyConfigStorageKey)
    try {
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig) as Partial<LayoutConfig>
        const theme = parsedConfig.theme
        nextConfig = {
          ...nextConfig,
          theme: isThemeName(theme) ? theme : nextConfig.theme,
        }
      }
    } catch {}

    setConfig(nextConfig)
    setIsDesktop(window.innerWidth >= 1024)
    setIsReady(true)

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isReady) {
      return
    }

    persistLayoutConfig(config)
    applyTheme(config.theme)

    if (config.theme !== 'system') {
      return
    }

    const mediaQuery = window.matchMedia(systemThemeQuery)
    const handleSystemThemeChange = () => applyTheme(config.theme)
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [config, isReady])

  const contextValue = useMemo(
    () => ({
      config,
      isDesktop,
      isReady,
      updateConfig,
      resetConfig,
    }),
    [config, isDesktop, isReady],
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
