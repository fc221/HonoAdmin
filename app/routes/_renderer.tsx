import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'
import {
  csrfFieldName,
  csrfHeaderName,
  getPreparedCsrfToken,
} from '../service/security/csrf'
import {
  layoutConfigStorageKey,
  layoutMainWidths,
  layoutPreset,
  layoutVariantCookieName,
  layoutVariants,
  systemThemeName,
  systemThemeQuery,
} from './-/components/layout/config'
import { resolveLayoutVariantFromRequest } from './-/utils/layout-variant'

const mainScript = `
  try {
    const storedConfig = localStorage.getItem(${JSON.stringify(layoutConfigStorageKey)}) || "{}";
    const config = JSON.parse(storedConfig);
    const defaultSidebarCollapsed = ${JSON.stringify(layoutPreset.sidebarCollapsed)};
    document.documentElement.dataset.sidebarCollapsed = config.sidebarCollapsed === true
      ? "true"
      : config.sidebarCollapsed === false ? "false" : defaultSidebarCollapsed ? "true" : "false";
    const defaultTopMenuCentered = ${JSON.stringify(layoutPreset.topMenuCentered)};
    document.documentElement.dataset.layoutTopMenuCentered = config.topMenuCentered === true
      ? "true"
      : config.topMenuCentered === false ? "false" : defaultTopMenuCentered ? "true" : "false";
    var mainWidths = ${JSON.stringify(layoutMainWidths)};
    document.documentElement.dataset.layoutMainWidth = mainWidths.indexOf(config.mainWidth) !== -1
      ? config.mainWidth
      : ${JSON.stringify(layoutPreset.mainWidth)};
    const theme = config.theme === ${JSON.stringify(systemThemeName)}
      ? (matchMedia(${JSON.stringify(systemThemeQuery)}).matches ? "dark" : "light")
      : config.theme;
    if (typeof theme === "string" && /^[A-Za-z][\\w-]{0,63}$/.test(theme)) {
      document.documentElement.setAttribute("data-theme", theme);
    }
    var variants = ${JSON.stringify(layoutVariants)};
    if (variants.indexOf(config.variant) !== -1) {
      document.documentElement.setAttribute("data-layout-variant", config.variant);
      var cookieName = ${JSON.stringify(layoutVariantCookieName)};
      var cookieValue = cookieName + "=" + config.variant + "; path=/; max-age=31536000; samesite=lax";
      if (document.cookie.indexOf(cookieName + "=" + config.variant) === -1) {
        document.cookie = cookieValue;
      }
    }
} catch (_) {}
`

export default jsxRenderer(({ children }, c) => {
  const csrfToken = getPreparedCsrfToken(c)
  const variant = resolveLayoutVariantFromRequest(c) ?? layoutPreset.variant
  const initialTheme = layoutPreset.defaultTheme === systemThemeName
    ? 'light'
    : layoutPreset.defaultTheme
  const initialSidebarCollapsed = layoutPreset.sidebarCollapsed ? 'true' : 'false'
  const initialTopMenuCentered = layoutPreset.topMenuCentered ? 'true' : 'false'

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      data-layout-main-width={layoutPreset.mainWidth}
      data-layout-top-menu-centered={initialTopMenuCentered}
      data-sidebar-collapsed={initialSidebarCollapsed}
      data-layout-variant={variant}
    >
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="turbo-prefetch" content="false" />
        <meta name="csrf-token" content={csrfToken} />
        <meta name="csrf-field" content={csrfFieldName} />
        <meta name="csrf-header" content={csrfHeaderName} />
        <link rel="icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: mainScript }} />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/routes/-/browser/index.ts" />
      </head>
      <body>{children}</body>
    </html>
  )
})
