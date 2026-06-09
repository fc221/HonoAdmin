import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import { listResource } from '../../shared/resource'

const updateResource: ResourceDefinition = {
  columns: [
    ['id', 'ID'],
    ['name', '项目'],
    ['status', '状态'],
  ],
  list: async (c) => ({
    items: [{ id: 1, name: '数据库迁移', status: c.config.bootstrap.isConfigured ? 'configured' : 'pending' }],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  }),
  title: '更新管理',
}

const systemUpdateApi = new Hono<AppEnv>()

systemUpdateApi.get('/', async (c) => c.json(await listResource(updateResource, c)))

export default systemUpdateApi
