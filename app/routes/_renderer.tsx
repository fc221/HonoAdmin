import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

const themeInitScript = `
try {
  const storedConfig = localStorage.getItem("layout-config") || localStorage.getItem("app-config") || "{}";
  const config = JSON.parse(storedConfig);
  const theme = config.theme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : config.theme;
  if (["light", "dark", "black"].includes(theme)) {
    document.documentElement.setAttribute("data-theme", theme);
  }
} catch (_) {}
`

export default jsxRenderer(({ children }) => {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      <body>{children}</body>
    </html>
  )
})
