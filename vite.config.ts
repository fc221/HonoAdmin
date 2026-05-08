import type { Plugin } from 'vite'
import buildBun from '@hono/vite-build/bun'
import buildCloudflareWorkers from '@hono/vite-build/cloudflare-workers'
import bunAdapter from '@hono/vite-dev-server/bun'
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

function disableDevCache(): Plugin {
  return {
    name: 'disable-dev-cache',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, max-age=0')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        next()
      })
    },
  }
}

function reloadAppOnChange(): Plugin {
  return {
    name: 'reload-app-on-change',
    apply: 'serve',
    handleHotUpdate({ file, server }) {
      if (!(/\/app\/.*\.[cm]?[tj]sx?$/).test(file)) {
        return undefined
      }

      server.ws.send({ type: 'full-reload', path: '*' })
      return []
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const runtimeTarget = getRuntimeTarget(command, mode)

  return {
    define: {
      __APP_NAME__: JSON.stringify('hono-admin'),
      __APP_VERSION__: JSON.stringify('0.0.0'),
      __APP_RUNTIME_TARGET__: JSON.stringify(runtimeTarget),
    },
    server: {
      host: '0.0.0.0',
    },
    ssr: command === 'serve'
      ? { external: ['casbin', 'buffer'] }
      : undefined,
    plugins: [
      disableDevCache(),
      honox({
        devServer: {
          adapter: runtimeTarget === 'cloudflare-workers'
            ? cloudflareAdapter
            : bunAdapter,
        },
        client: { input: ['/app/client.ts', '/app/style.css'] },
      }),
      reloadAppOnChange(),
      tailwindcss(),
      runtimeTarget === 'cloudflare-workers'
        ? buildCloudflareWorkers()
        : buildBun(),
    ],
  }
})

function getRuntimeTarget(
  command: 'build' | 'serve',
  mode: string,
): 'bun' | 'cloudflare-workers' {
  if (mode === 'bun') {
    return 'bun'
  }

  if (mode === 'cloudflare-workers') {
    return 'cloudflare-workers'
  }

  return command === 'build' ? 'cloudflare-workers' : 'bun'
}
