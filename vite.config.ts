import type { Plugin, ViteDevServer } from 'vite'
import buildBun from '@hono/vite-build/bun'
import buildCloudflareWorkers from '@hono/vite-build/cloudflare-workers'
import bunAdapter from '@hono/vite-dev-server/bun'
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

const appSourceFileExtensions = new Set([
  'cjs',
  'cts',
  'js',
  'jsx',
  'mjs',
  'mts',
  'ts',
  'tsx',
])
const commonSsrExternal = ['buffer', 'casbin']
const bunOnlySsrExternal = ['selfsigned', 'ssh2']

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

function fullReloadOnAppChange(): Plugin {
  let changedFile = ''
  let reloadTimer: ReturnType<typeof setTimeout> | null = null

  function queueReload(server: ViteDevServer, file: string) {
    changedFile = file

    if (reloadTimer) {
      clearTimeout(reloadTimer)
    }

    reloadTimer = setTimeout(() => {
      invalidateDevModuleCache(server, changedFile)
      server.ws.send({ type: 'full-reload' })
      server.config.logger.info(
        `[hono-admin] app source changed, full reload: ${formatProjectPath(changedFile)}`,
      )
      reloadTimer = null
    }, 50)
  }

  return {
    name: 'hono-admin-full-reload-on-app-change',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(getAppRoot())

      const reload = (file: string) => {
        if (isAppSourceFile(file)) {
          queueReload(server, file)
        }
      }

      server.watcher.on('add', reload)
      server.watcher.on('change', reload)
      server.watcher.on('unlink', reload)
    },
  }
}

interface RunnableEnvironmentLike {
  moduleGraph?: {
    invalidateAll?: () => void
  }
  runner?: {
    evaluatedModules?: {
      clear?: () => void
    }
  }
}

function invalidateDevModuleCache(server: ViteDevServer, file: string) {
  const normalizedFile = file.replace(/\\/g, '/')

  server.moduleGraph.onFileChange(normalizedFile)
  server.moduleGraph.invalidateAll()

  for (const environment of Object.values(server.environments)) {
    const runnableEnvironment = environment as unknown as RunnableEnvironmentLike
    runnableEnvironment.moduleGraph?.invalidateAll?.()
    if ('runner' in runnableEnvironment) {
      runnableEnvironment.runner?.evaluatedModules?.clear?.()
    }
  }
}

function formatProjectPath(file: string): string {
  const normalizedFile = file.replace(/\\/g, '/')
  const projectRoot = `${process.cwd().replace(/\\/g, '/')}/`

  return normalizedFile.startsWith(projectRoot)
    ? normalizedFile.slice(projectRoot.length)
    : normalizedFile
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
      port: 5173,
      watch: {
        ignored: [
          '**/uploads/**',
          '**/docs/**',
          '**/scripts/**',
          '**/tests/**',
          '**/dist/**',
          '**/.wrangler/**',
          '**/*.sqlite',
          '**/*.sqlite-*',
          '**/*.db',
          '**/*.db-*',
          '**/*.log',
        ],
      },
    },
    ssr: {
      external: runtimeTarget === 'bun'
        ? [...commonSsrExternal, ...bunOnlySsrExternal]
        : commonSsrExternal,
    },
    plugins: [
      disableDevCache(),
      fullReloadOnAppChange(),
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

function isAppSourceFile(file: string): boolean {
  const normalizedFile = file.replace(/\\/g, '/')
  const appRoot = `${getAppRoot()}/`
  const extension = normalizedFile.split('.').pop()

  return (
    normalizedFile.startsWith(appRoot)
    && !!extension
    && appSourceFileExtensions.has(extension)
  )
}

function getAppRoot(): string {
  return `${process.cwd().replace(/\\/g, '/')}/app`
}

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
