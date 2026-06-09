import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  clearOperateLogs,
  deleteOperateLog,
  listOperateLogs,
} from '../../../service/admin/system/operate-log'
import {
  deleteAction,
  deleteResource,
  listInput,
  listResource,
  mutationResult,
  resourceId,
} from '../../shared/resource'

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

systemOperateLogApi.get('/', async (c) => c.json(await listResource(operateLogResource, c)))
systemOperateLogApi.post('/clear', async (c) => {
  const count = await clearOperateLogs(c)
  return c.json(mutationResult(`已清空 ${count} 条日志。`, null))
})
systemOperateLogApi.delete('/:id', async (c) => c.json(await deleteResource(operateLogResource, c, resourceId(c))))

export default systemOperateLogApi
