import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import {
  deleteWebFeedback,
  getWebFeedbackById,
  listWebFeedbacks,
  updateWebFeedback,
} from '../../../service/admin/web/feedback'
import { webFeedbackStatusOptions } from '../../../service/admin/web/feedback/enum'
import {
  deleteAction,
  editAction,
  listInput,
} from '../../shared/resource'
import { buildResourceApp } from '../../shared/resource-routes'

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

const webFeedbackApi = buildResourceApp(feedbackResource, { tag: 'admin' })

export default webFeedbackApi

function feedbackEditFields(): ResourceField[] {
  return [
    { key: 'status', label: '状态', options: webFeedbackStatusOptions, type: 'select' },
    { key: 'reply', label: '回复', type: 'textarea' },
  ]
}
