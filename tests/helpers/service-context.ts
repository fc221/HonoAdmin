import type { ServiceContext } from '../../apps/server/src/service/types'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MemoryCacheAdapter } from '@hono-admin/cache/adapter/memory'
import { createLocalSqliteAdapter } from '@hono-admin/runtime/local-sqlite'
import { defaultSecurityRuntimeConfig } from '@hono-admin/runtime/security-config'
import { runMigrations } from '../../apps/server/src/migrations/migrator'

export interface TestServiceContext {
  cleanup: () => Promise<void>
  ctx: ServiceContext
}

export async function createTestServiceContext(options: {
  runMigrations?: boolean
} = {}): Promise<TestServiceContext> {
  const dir = await mkdtemp(join(tmpdir(), 'hono-admin-test-'))
  const db = await createLocalSqliteAdapter(join(dir, 'test.sqlite'))
  const cache = new MemoryCacheAdapter('test')

  if (options.runMigrations !== false) {
    await runMigrations(db)
  }

  const runtime = {
    cache,
    config: {
      appName: 'hono-admin-test',
      appVersion: '0.0.0-test',
      bootstrap: {
        canWriteConfig: true,
        isConfigured: true,
        missingKeys: [],
        requirements: [],
        runtimeTarget: 'bun' as const,
      },
      jwtSecret: 'test-jwt-secret-1234567890',
      sessionSecret: 'test-session-secret-1234567890',
      runtimeTarget: 'bun' as const,
      security: defaultSecurityRuntimeConfig,
      timezone: 'Asia/Shanghai',
    },
    db,
  }

  return {
    cleanup: async () => {
      await db.close?.()
      await rm(dir, { force: true, recursive: true })
    },
    ctx: {
      cache,
      config: runtime.config,
      db,
      now: () => 1767225600000,
      runtime,
    },
  }
}
