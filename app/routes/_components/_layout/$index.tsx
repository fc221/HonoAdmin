import { Child, useEffect, useState } from 'hono/jsx'
import LayoutProvider, { useLayoutContext } from './$context'
import Aside from './_components/$aside'
import Header from './_components/$header'

interface Props {
  children: Child
}

export default function Layout({ children }: Props) {
  return (
    <LayoutProvider>
      <AsideLayout>{children}</AsideLayout>
    </LayoutProvider>
  )
}

// 侧边栏布局
function AsideLayout({ children }: Props) {
  const { config, isDesktop, isReady, updateConfig } = useLayoutContext()
  const [isAsideOpen, setIsAsideOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const id = 'aside-drawer'
  const isDrawerOpen = isReady ? isDesktop || isAsideOpen : false

  useEffect(() => {
    if (!isReady) {
      return
    }

    if (isDesktop) {
      setIsAsideOpen(false)
      return
    }

    setIsCollapsed(false)

    setIsAsideOpen(false)
  }, [isDesktop, isReady])

  const handleAsideToggle = () => {
    if (isDesktop) {
      setIsCollapsed((prev) => !prev)
      return
    }

    setIsAsideOpen((prev) => !prev)
  }

  return (
    <div class="h-screen p-4 bg-base-200">
      <div class="drawer lg:drawer-open h-full! lg:gap-4">
        <input
          id={id}
          type="checkbox"
          class="drawer-toggle"
          checked={isDrawerOpen}
          onChange={() => {
            if (!isDesktop) {
              setIsAsideOpen((prev) => !prev)
            }
          }}
        />
        {/* aside */}
        <Aside
          id={id}
          isDesktop={isDesktop}
          isAsideOpen={isAsideOpen}
          isCollapsed={isCollapsed}
          onToggle={handleAsideToggle}
          theme={config.theme}
          onThemeChange={(theme) => updateConfig({ theme })}
        />
        {/* content */}
        <main class="drawer-content">
          {/* header */}
          <Header
            isReady={isReady}
            isDesktop={isDesktop}
            isAsideOpen={isAsideOpen}
            isCollapsed={isCollapsed}
            onToggle={handleAsideToggle}
            onRefresh={() => location.reload()}
          />
          <div class="p-4">{children}</div>
        </main>
      </div>
    </div>
  )
}
