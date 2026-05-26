import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'
import {
  csrfFieldName,
  csrfHeaderName,
  getPreparedCsrfToken,
} from '../service/security/csrf'
import {
  customThemeStyleId,
  layoutConfigStorageKey,
  layoutPreset,
  layoutVariantCookieName,
  layoutVariants,
  systemThemeQuery,
} from './-/components/layout/config'
import { resolveLayoutVariantFromRequest } from './-/utils/layout-variant'

const mainScript = `
  try {
    const storedConfig = localStorage.getItem(${JSON.stringify(layoutConfigStorageKey)}) || "{}";
    const config = JSON.parse(storedConfig);
    document.documentElement.dataset.sidebarCollapsed = config.sidebarCollapsed === true ? "true" : "false";
    const theme = config.theme === "system"
      ? (matchMedia(${JSON.stringify(systemThemeQuery)}).matches ? "dark" : "light")
      : config.theme;
    if (["light", "dark", "black"].includes(theme)) {
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
  if (config.customTheme && typeof config.customTheme === "object") {
    var ct = config.customTheme;
    var lines = [];
    var colors = ct.colors || {};
    var colorKeys = ["primary","primary-content","secondary","secondary-content","accent","accent-content","neutral","neutral-content","base-100","base-200","base-300","base-content","info","info-content","success","success-content","warning","warning-content","error","error-content"];
    for (var i = 0; i < colorKeys.length; i++) {
      var k = colorKeys[i];
      if (typeof colors[k] === "string" && colors[k]) {
        lines.push("--color-" + k + ":" + colors[k]);
      }
    }
    if (typeof ct.radiusBox === "string") lines.push("--radius-box:" + ct.radiusBox);
    if (typeof ct.radiusField === "string") lines.push("--radius-field:" + ct.radiusField);
    if (typeof ct.radiusSelector === "string") lines.push("--radius-selector:" + ct.radiusSelector);
    if (typeof ct.sizeField === "string") lines.push("--size-field:" + ct.sizeField);
    if (typeof ct.sizeSelector === "string") lines.push("--size-selector:" + ct.sizeSelector);
    if (typeof ct.borderWidth === "string") lines.push("--border:" + ct.borderWidth);
    if (typeof ct.depth === "boolean") lines.push("--depth:" + (ct.depth ? "1" : "0"));
    if (typeof ct.noise === "boolean") lines.push("--noise:" + (ct.noise ? "1" : "0"));
    if (lines.length) {
      var styleEl = document.getElementById(${JSON.stringify(customThemeStyleId)});
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = ${JSON.stringify(customThemeStyleId)};
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = ":root{" + lines.join(";") + ";}";
    }
  }
} catch (_) {}
`

export default jsxRenderer(({ children }, c) => {
  const csrfToken = getPreparedCsrfToken(c)
  const variant = resolveLayoutVariantFromRequest(c) ?? layoutPreset.variant

  return (
    <html
      lang="en"
      data-theme="light"
      data-sidebar-collapsed="false"
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
