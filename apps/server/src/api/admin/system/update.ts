import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  getDatabaseMigrationStatus,
  getUpdateStatus,
  runDatabaseMigrations,
} from '../../../service/admin/system/update'
import { describeRoute, jsonResponse } from '../../shared/openapi'
import { buildResourceApp } from '../../shared/resource-routes'
import { resourceMutationSchema } from '../../shared/resource-schema'
import { updateStatusSchema } from './update-schema'

const updateResource: ResourceDefinition = {
  columns: [
    ['id', 'ID'],
    ['name', '项目'],
    ['status', '状态'],
    ['pendingCount', '待迁移'],
    ['latestAppliedMigrationId', '当前迁移'],
    ['latestCodeMigrationId', '代码迁移'],
  ],
  list: async (c) => {
    const update = await getUpdateStatus(c)

    return {
      items: [{
        id: 1,
        latestAppliedMigrationId: update.migration.latestAppliedMigrationId ?? '-',
        latestCodeMigrationId: update.migration.latestCodeMigrationId ?? '-',
        name: '数据库迁移',
        pendingCount: update.migration.pendingCount,
        status: update.migration.isComplete ? '已是最新' : '待迁移',
      }],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    }
  },
  title: '更新管理',
}

const systemUpdateApi = new Hono<AppEnv>()
  .get(
    '/status',
    describeRoute({
      tags: ['admin'],
      summary: '读取更新状态',
      responses: { 200: jsonResponse(updateStatusSchema, '更新状态') },
    }),
    async (c) => c.json(updateStatusSchema.parse(await getUpdateStatus(c))),
  )
  .post(
    '/migrate',
    describeRoute({
      tags: ['admin'],
      summary: '执行数据库迁移',
      responses: { 200: jsonResponse(resourceMutationSchema, '迁移已完成') },
    }),
    async (c) => {
      const before = await getDatabaseMigrationStatus(c)
      const migration = before.isComplete
        ? before
        : await runDatabaseMigrations(c)

      return c.json(resourceMutationSchema.parse({
        data: { migration },
        message: before.isComplete ? '数据库已是最新。' : '数据库迁移已完成。',
        ok: true,
      }))
    },
  )
  .route('/', buildResourceApp(updateResource, { tag: 'admin' }))

export default systemUpdateApi
