import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'
import {
  csrfFieldName,
  csrfHeaderName,
  getPreparedCsrfToken,
} from '../service/security/csrf'
import {
  hasCollapsibleSidebarVariant,
  isHybridVariant,
  isTopNavVariant,
  layoutConfigStorageKey,
  layoutMainWidths,
  layoutPreset,
  layoutSidebarLogoStyles,
  layoutSidebarMenuStyles,
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
    var variants = ${JSON.stringify(layoutVariants)};
    var variant = variants.indexOf(config.variant) !== -1
      ? config.variant
      : ${JSON.stringify(layoutPreset.variant)};
    var hybrid = variant === "hybrid" || variant === "hybrid-flush";
    var topNav = variant === "top-nav" || variant === "top-nav-flush";
    var collapsibleSidebar = variant === "sidebar" || variant === "sidebar-flush" || hybrid;
    const defaultSidebarCollapsed = ${JSON.stringify(layoutPreset.sidebarCollapsed)};
    document.documentElement.dataset.sidebarCollapsed = !collapsibleSidebar
      ? "false"
      : config.sidebarCollapsed === true
      ? "true"
      : config.sidebarCollapsed === false ? "false" : defaultSidebarCollapsed ? "true" : "false";
    const defaultTopMenuCentered = ${JSON.stringify(layoutPreset.topMenuCentered)};
    document.documentElement.dataset.layoutTopMenuCentered = !topNav
      ? "false"
      : config.topMenuCentered === true
      ? "true"
      : config.topMenuCentered === false ? "false" : defaultTopMenuCentered ? "true" : "false";
    var mainWidths = ${JSON.stringify(layoutMainWidths)};
    document.documentElement.dataset.layoutMainWidth = hybrid
      ? "wide"
      : mainWidths.indexOf(config.mainWidth) !== -1
      ? config.mainWidth
      : ${JSON.stringify(layoutPreset.mainWidth)};
    var sidebarLogoStyles = ${JSON.stringify(layoutSidebarLogoStyles)};
    document.documentElement.dataset.layoutSidebarLogoStyle = sidebarLogoStyles.indexOf(config.sidebarLogoStyle) !== -1
      ? config.sidebarLogoStyle
      : ${JSON.stringify(layoutPreset.sidebarLogoStyle)};
    var sidebarMenuStyles = ${JSON.stringify(layoutSidebarMenuStyles)};
    document.documentElement.dataset.layoutSidebarMenuStyle = sidebarMenuStyles.indexOf(config.sidebarMenuStyle) !== -1
      ? config.sidebarMenuStyle
      : ${JSON.stringify(layoutPreset.sidebarMenuStyle)};
    const theme = config.theme === ${JSON.stringify(systemThemeName)}
      ? (matchMedia(${JSON.stringify(systemThemeQuery)}).matches ? "dark" : "light")
      : config.theme;
    if (typeof theme === "string" && /^[A-Za-z][\\w-]{0,63}$/.test(theme)) {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (variants.indexOf(variant) !== -1) {
      document.documentElement.setAttribute("data-layout-variant", variant);
      var cookieName = ${JSON.stringify(layoutVariantCookieName)};
      var cookieValue = cookieName + "=" + variant + "; path=/; max-age=31536000; samesite=lax";
      if (document.cookie.indexOf(cookieName + "=" + variant) === -1) {
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
  const initialSidebarCollapsed = hasCollapsibleSidebarVariant(variant) && layoutPreset.sidebarCollapsed
    ? 'true'
    : 'false'
  const initialMainWidth = isHybridVariant(variant) ? 'wide' : layoutPreset.mainWidth
  const initialTopMenuCentered = isTopNavVariant(variant) && layoutPreset.topMenuCentered
    ? 'true'
    : 'false'

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      data-layout-main-width={initialMainWidth}
      data-layout-sidebar-logo-style={layoutPreset.sidebarLogoStyle}
      data-layout-sidebar-menu-style={layoutPreset.sidebarMenuStyle}
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
        <Script src="/app/client.ts" />
      </head>
      <body>{children}</body>
    </html>
  )
})
