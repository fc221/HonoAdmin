import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  clearOperateLogs,
  deleteOperateLog,
  listOperateLogs,
} from '../../../service/admin/system/operate-log'
import { describeRoute, jsonResponse } from '../../shared/openapi'
import {
  deleteAction,
  listInput,
  mutationResult,
} from '../../shared/resource'
import { buildResourceApp } from '../../shared/resource-routes'
import { resourceMutationSchema } from '../../shared/resource-schema'

const operateLogResource: ResourceDefinition = {
  actions: [{ danger: true, key: 'clear', label: '清空日志' }],
  columns: [
    ['id', 'ID'],
    ['logType', '类型'],
    ['logMsg', '内容'],
    ['status', '状态'],
    ['createdAt', '时间'],
  ],
  delete: deleteOperateLog,
  list: (c) => listOperateLogs(c, listInput(c)),
  rowActions: [deleteAction],
  title: '操作日志',
}

const systemOperateLogApi = new Hono<AppEnv>()
  .post(
    '/clear',
    describeRoute({
      tags: ['admin'],
      summary: '清空操作日志',
      responses: { 200: jsonResponse(resourceMutationSchema, '日志已清空') },
    }),
    async (c) => {
      const count = await clearOperateLogs(c)
      return c.json(mutationResult(`已清空 ${count} 条日志。`, null))
    },
  )
  .route('/', buildResourceApp(operateLogResource, { tag: 'admin' }))

export default systemOperateLogApi
