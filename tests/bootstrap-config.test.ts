import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import {
  getBunConfigPath,
  getCloudflareWorkersBootstrapConfigStatus,
  reloadBunRuntime,
  saveBunRuntimeConfig,
} from '../app/infra/runtime'

describe('bootstrap runtime config', () => {
  test('resolves Bun env file path from binding, process env, then cwd', () => {
    const originalEnvFile = process.env.HONO_ADMIN_ENV_FILE

    try {
      delete process.env.HONO_ADMIN_ENV_FILE
      expect(getBunConfigPath()).toBe(join(process.cwd(), '.env'))

      process.env.HONO_ADMIN_ENV_FILE = '/tmp/hono-admin-process.env'
      expect(getBunConfigPath()).toBe('/tmp/hono-admin-process.env')

      expect(getBunConfigPath({
        HONO_ADMIN_ENV_FILE: '/tmp/hono-admin-binding.env',
      })).toBe('/tmp/hono-admin-binding.env')
    } finally {
      restoreEnvFile(originalEnvFile)
    }
  })

  test('writes Bun config to HONO_ADMIN_ENV_FILE path', async () => {
    const originalEnvFile = process.env.HONO_ADMIN_ENV_FILE
    const dir = await mkdtemp(join(tmpdir(), 'hono-admin-bootstrap-'))
    const envPath = join(dir, 'runtime.env')

    try {
      process.env.HONO_ADMIN_ENV_FILE = envPath
      await saveBunRuntimeConfig({
        appTimezone: 'Asia/Shanghai',
        cacheNamespace: 'hono-admin',
        databaseUrl: './data.sqlite',
        jwtSecret: '1234567890abcdef',
      })

      const content = await readFile(envPath, 'utf8')
      expect(content).toContain('DATABASE_URL="./data.sqlite"')
      expect(content).toContain('APP_TIMEZONE="Asia/Shanghai"')
    } finally {
      restoreEnvFile(originalEnvFile)
      await rm(dir, { force: true, recursive: true })
    }
  })

  test('writes managed Bun env keys and preserves unknown keys', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hono-admin-bootstrap-'))
    const envPath = join(dir, '.env')

    try {
      await writeFile(envPath, 'CUSTOM_FLAG=true\nAPP_TIMEZONE=UTC\n')
      await saveBunRuntimeConfig({
        appTimezone: 'Asia/Shanghai',
        cacheNamespace: 'hono-admin',
        databaseUrl: './data.sqlite',
        jwtSecret: '1234567890abcdef',
      }, envPath)

      const content = await readFile(envPath, 'utf8')
      expect(content).toContain('CUSTOM_FLAG=true')
      expect(content).toContain('APP_TIMEZONE="Asia/Shanghai"')
      expect(content).toContain('CACHE_NAMESPACE="hono-admin"')
      expect(content).toContain('DATABASE_URL="./data.sqlite"')
      expect(content).toContain('JWT_SECRET="1234567890abcdef"')
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })

  test('reloads Bun runtime from saved config and closes old database', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hono-admin-bootstrap-'))
    const envPath = join(dir, '.env')
    const firstDbPath = join(dir, 'first.sqlite')
    const secondDbPath = join(dir, 'second.sqlite')

    try {
      await saveBunRuntimeConfig({
        appTimezone: 'Asia/Shanghai',
        cacheNamespace: 'hono-admin',
        databaseUrl: firstDbPath,
        jwtSecret: '1234567890abcdef',
      }, envPath)

      const firstRuntime = await reloadBunRuntime({
        HONO_ADMIN_ENV_FILE: envPath,
      })

      expect(firstRuntime.config.bootstrap.isConfigured).toBe(true)
      expect(firstRuntime.db.kind).toBe('sqlite')
      await expect(firstRuntime.db.query('select 1 as value')).resolves.toEqual(
        [{ value: 1 }],
      )

      await saveBunRuntimeConfig({
        appTimezone: 'Asia/Shanghai',
        cacheNamespace: 'hono-admin-next',
        databaseUrl: secondDbPath,
        jwtSecret: 'abcdef1234567890',
      }, envPath)

      const secondRuntime = await reloadBunRuntime({
        HONO_ADMIN_ENV_FILE: envPath,
      })

      expect(secondRuntime.config.bootstrap.isConfigured).toBe(true)
      expect(secondRuntime.db.kind).toBe('sqlite')
      await expect(firstRuntime.db.query('select 1 as value')).rejects.toThrow()
    } finally {
      await reloadBunRuntime({
        HONO_ADMIN_ENV_FILE: join(dir, 'missing.env'),
      }).catch(() => undefined)
      await rm(dir, { force: true, recursive: true })
    }
  })

  test('reports missing Cloudflare Workers bindings and secrets', () => {
    const status = getCloudflareWorkersBootstrapConfigStatus({})

    expect(status.isConfigured).toBe(false)
    expect(status.canWriteConfig).toBe(false)
    expect(status.missingKeys).toEqual(['DB', 'APP_TIMEZONE', 'JWT_SECRET'])
  })
})

function restoreEnvFile(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.HONO_ADMIN_ENV_FILE
    return
  }

  process.env.HONO_ADMIN_ENV_FILE = value
}
