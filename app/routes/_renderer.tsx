import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'
import {
  layoutConfigStorageKey,
  systemThemeQuery,
} from './_components/_layout/config'

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
} catch (_) {}
`

export default jsxRenderer(({ children }) => {
  return (
    <html
      lang="en"
      data-theme="light"
      data-layout-ready="false"
      data-sidebar-collapsed="false"
    >
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: mainScript }} />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      <body>{children}</body>
    </html>
  )
})
