import buildBun from '@hono/vite-build/bun'
import buildCloudflareWorkers from '@hono/vite-build/cloudflare-workers'
import bunAdapter from '@hono/vite-dev-server/bun'
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

const commonSsrExternal = ['buffer', 'casbin', 'mysql2', 'mysql2/promise', 'postgres']
const bunOnlySsrExternal = ['selfsigned', 'ssh2']

export default defineConfig(({ command, mode }) => {
  const runtimeTarget = getRuntimeTarget(command, mode)

  return {
    server: {
      host: '0.0.0.0',
      watch: {
        ignored: ['**/uploads/**'],
      },
    },
    define: {
      __APP_NAME__: JSON.stringify('hono-admin'),
      __APP_VERSION__: JSON.stringify('0.0.0'),
      __APP_RUNTIME_TARGET__: JSON.stringify(runtimeTarget),
    },
    ssr: {
      external: runtimeTarget === 'bun'
        ? [...commonSsrExternal, ...bunOnlySsrExternal]
        : commonSsrExternal,
    },
    plugins: [
      honox({
        devServer: {
          adapter: runtimeTarget === 'cloudflare-workers'
            ? cloudflareAdapter
            : bunAdapter,
        },
        client: {
          input: [
            '/app/routes/-/browser/index.ts',
            '/app/style.css',
          ],
        },
      }),
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

  if (command === 'build' || mode === 'cloudflare-workers') {
    return 'cloudflare-workers'
  }

  return 'bun'
}
