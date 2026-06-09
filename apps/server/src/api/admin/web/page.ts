import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  createWebPage,
  deleteWebPage,
  getWebPageById,
  listWebPages,
  updateWebPage,
} from '../../../service/admin/web/page'
import {
  createAction,
  createResource,
  deleteAction,
  deleteResource,
  editAction,
  getResourceDetail,
  listInput,
  listResource,
  resourceId,
  updateResource,
} from '../../shared/resource'

const pageResource: ResourceDefinition = {
  actions: [createAction],
  columns: [
    ['id', 'ID'],
    ['title', '标题'],
    ['alias', '别名'],
    ['category', '分类'],
    ['updatedAt', '更新时间'],
  ],
  create: (c, input) => createWebPage(c, input as never),
  createFields: pageFields,
  delete: deleteWebPage,
  editFields: pageFields,
  get: getWebPageById,
  list: (c) => listWebPages(c, listInput(c)),
  rowActions: [editAction, deleteAction],
  title: '页面管理',
  update: (c, id, input) => updateWebPage(c, id, input as never),
}

const webPageApi = new Hono<AppEnv>()

webPageApi.get('/', async (c) => c.json(await listResource(pageResource, c)))
webPageApi.get('/:id', async (c) => c.json(await getResourceDetail(pageResource, c, resourceId(c))))
webPageApi.post('/', async (c) => c.json(await createResource(pageResource, c, await c.req.json())))
webPageApi.put('/:id', async (c) => c.json(await updateResource(pageResource, c, resourceId(c), await c.req.json())))
webPageApi.delete('/:id', async (c) => c.json(await deleteResource(pageResource, c, resourceId(c))))

export default webPageApi

function pageFields(): ResourceField[] {
  return [
    { key: 'title', label: '页面标题', required: true, type: 'text' },
    { key: 'alias', label: '页面别名', required: true, type: 'text' },
    { key: 'category', label: '分类', type: 'text' },
    { key: 'summary', label: '摘要', type: 'textarea' },
    { key: 'content', label: '内容', required: true, type: 'richtext' },
  ]
}
