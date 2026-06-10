import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import {
  createWebNotification,
  deleteWebNotification,
  getWebNotificationById,
  listWebNotifications,
  updateWebNotification,
} from '../../../service/admin/web/notification'
import {
  createAction,
  deleteAction,
  editAction,
  listInput,
} from '../../shared/resource'
import { buildResourceApp } from '../../shared/resource-routes'

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

const webNotificationApi = buildResourceApp(notificationResource, { tag: 'admin' })

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
