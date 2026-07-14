import { describe, expect, test } from 'bun:test'
import { purgeOperateLogs } from '../apps/server/src/service/admin/system/operate-log'
import { createTestServiceContext } from './helpers/service-context'

const DAY = 24 * 60 * 60 * 1000

describe('purgeOperateLogs', () => {
  test('deletes logs past retention in batches and keeps recent ones', async () => {
    const { ctx, cleanup } = await createTestServiceContext()
    try {
      const now = ctx.now()
      // 12 条超保留期(35 天前)+ 3 条保留期内(1 天前)。
      const old = Array.from({ length: 12 }, (_, i) => now - 35 * DAY + i)
      const recent = [now - DAY, now - DAY + 1, now - DAY + 2]
      await insertOperateLogs(ctx, [...old, ...recent])

      // batchSize=5 强制多批(12 → 5 + 5 + 2),验证循环正确终止且删全。
      const purged = await purgeOperateLogs(ctx, 30, 5)

      expect(purged).toBe(12)
      const remaining = await ctx.db.query<{ created_at: number }>(
        'SELECT created_at FROM sys_operate_log ORDER BY created_at ASC',
      )
      expect(remaining.map((row) => Number(row.created_at))).toEqual(recent)
    } finally {
      await cleanup()
    }
  })
})

async function insertOperateLogs(
  ctx: Awaited<ReturnType<typeof createTestServiceContext>>['ctx'],
  createdAtList: number[],
): Promise<void> {
  for (const createdAt of createdAtList) {
    await ctx.db.execute(
      'INSERT INTO sys_operate_log (log_type, log_msg, status, created_at) VALUES (?, ?, ?, ?)',
      ['unknown', 'purge', 'success', createdAt],
    )
  }
}
