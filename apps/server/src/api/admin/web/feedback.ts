import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  deleteWebFeedback,
  getWebFeedbackById,
  listWebFeedbacks,
  updateWebFeedback,
} from '../../../service/admin/web/feedback'
import { webFeedbackStatusOptions } from '../../../service/admin/web/feedback/enum'
import {
  deleteAction,
  deleteResource,
  editAction,
  getResourceDetail,
  listInput,
  listResource,
  resourceId,
  updateResource,
} from '../../shared/resource'

const feedbackResource: ResourceDefinition = {
  columns: [
    ['id', 'ID'],
    ['title', '标题'],
    ['contact', '联系方式'],
    ['status', '状态'],
    ['updatedAt', '更新时间'],
  ],
  delete: deleteWebFeedback,
  editFields: feedbackEditFields,
  get: getWebFeedbackById,
  list: (c) => listWebFeedbacks(c, listInput(c)),
  rowActions: [editAction, deleteAction],
  title: '用户反馈',
  update: (c, id, input) => updateWebFeedback(c, id, input as never),
}

const webFeedbackApi = new Hono<AppEnv>()

webFeedbackApi.get('/', async (c) => c.json(await listResource(feedbackResource, c)))
webFeedbackApi.get('/:id', async (c) => c.json(await getResourceDetail(feedbackResource, c, resourceId(c))))
webFeedbackApi.put('/:id', async (c) => c.json(await updateResource(feedbackResource, c, resourceId(c), await c.req.json())))
webFeedbackApi.delete('/:id', async (c) => c.json(await deleteResource(feedbackResource, c, resourceId(c))))

export default webFeedbackApi

function feedbackEditFields(): ResourceField[] {
  return [
    { key: 'status', label: '状态', options: webFeedbackStatusOptions, type: 'select' },
    { key: 'reply', label: '回复', type: 'textarea' },
  ]
}
