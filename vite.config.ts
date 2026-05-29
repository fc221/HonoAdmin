import buildBun from '@hono/vite-build/bun'
// import buildCloudflareWorkers from '@hono/vite-build/cloudflare-workers'
import bunAdapter from '@hono/vite-dev-server/bun'
// import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

declare module 'vite' {
  interface ConfigEnv {
    runtime?: 'bun' | 'cloudflare-workers'
  }
}

const commonSsrExternal = ['buffer', 'casbin', 'mysql2', 'mysql2/promise', 'postgres']

// Paths whose contents are hash-named by Vite — safe to long-cache.
const longCachePathPrefixes = ['/static/', '/assets/']
const longCacheValue = 'public, max-age=31536000, immutable'

// Override the default bun adapter hook: register a Cache-Control middleware
// on `mainApp` before the auto-injected `serveStatic` for hashed assets,
// since the inner honox app never sees `/static/*` and `/assets/*` requests.
function bunStaticCacheBeforeHook(appName: string, options?: { staticPaths?: string[] }) {
  const cacheMiddlewares = longCachePathPrefixes
    .map((prefix) => `${appName}.use('${prefix}*', async (c, next) => { await next(); c.header('Cache-Control', '${longCacheValue}') })`)
    .join('\n')
  const staticHandlers = (options?.staticPaths ?? [])
    .map((p) => `${appName}.use('${p}', serveStatic({ root: './' }))`)
    .join('\n')
  return `import { serveStatic } from 'hono/bun'\n${cacheMiddlewares}\n${staticHandlers}\n`
}

export default defineConfig(({ runtime = 'bun' }) => {
  console.log(`Using runtime target: ${runtime}`)
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
      __APP_RUNTIME_TARGET__: JSON.stringify(runtime),
    },
    ssr: {
      external: commonSsrExternal,
    },
    plugins: [
      honox({
        devServer: {
          adapter: bunAdapter,
          // adapter: runtime === 'cloudflare-workers'
          //   ? cloudflareAdapter
          //   : bunAdapter,
        },
        client: {
          input: [
            '/app/client.ts',
            '/app/style.css',
          ],
        },
      }),
      tailwindcss(),
      buildBun({
        entryContentBeforeHooks: [bunStaticCacheBeforeHook],
      }),
      // runtime === 'cloudflare-workers'
      //   ? buildCloudflareWorkers()
      //   : buildBun(),
    ],
  }
})
