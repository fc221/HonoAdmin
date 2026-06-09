import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  createWebNotification,
  deleteWebNotification,
  getWebNotificationById,
  listWebNotifications,
  updateWebNotification,
} from '../../../service/admin/web/notification'
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

const notificationResource: ResourceDefinition = {
  actions: [createAction],
  columns: [
    ['id', 'ID'],
    ['title', '标题'],
    ['alias', '别名'],
    ['isTop', '置顶'],
    ['updatedAt', '更新时间'],
  ],
  create: (c, input) => createWebNotification(c, input as never),
  createFields: notificationFields,
  delete: deleteWebNotification,
  editFields: notificationFields,
  get: getWebNotificationById,
  list: (c) => listWebNotifications(c, listInput(c)),
  rowActions: [editAction, deleteAction],
  title: '公告管理',
  update: (c, id, input) => updateWebNotification(c, id, input as never),
}

const webNotificationApi = new Hono<AppEnv>()

webNotificationApi.get('/', async (c) => c.json(await listResource(notificationResource, c)))
webNotificationApi.get('/:id', async (c) => c.json(await getResourceDetail(notificationResource, c, resourceId(c))))
webNotificationApi.post('/', async (c) => c.json(await createResource(notificationResource, c, await c.req.json())))
webNotificationApi.put('/:id', async (c) => c.json(await updateResource(notificationResource, c, resourceId(c), await c.req.json())))
webNotificationApi.delete('/:id', async (c) => c.json(await deleteResource(notificationResource, c, resourceId(c))))

export default webNotificationApi

function notificationFields(): ResourceField[] {
  return [
    { key: 'title', label: '公告标题', required: true, type: 'text' },
    { key: 'alias', label: '公告别名', required: true, type: 'text' },
    { key: 'content', label: '内容', required: true, type: 'richtext' },
    { key: 'isTop', label: '置顶', type: 'switch' },
    { key: 'isImportant', label: '重要', type: 'switch' },
  ]
}
