import type { ServiceContext } from '../../app/service/types'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MemoryCacheAdapter } from '../../app/infra/cache/adapter/memory'
import { runMigrations } from '../../app/infra/database/migrator'
import { createLocalSqliteAdapter } from '../../app/infra/runtime/local-sqlite'

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
      runtimeTarget: 'bun' as const,
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
      now: () => '2026-01-01T00:00:00.000Z',
      runtime,
    },
  }
}
