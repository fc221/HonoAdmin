import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import {
  createWebPage,
  deleteWebPage,
  getWebPageById,
  listWebPages,
  updateWebPage,
} from '../../../service/admin/web/page'
import { aliasPattern } from '../../../service/common/alias'
import {
  createAction,
  deleteAction,
  editAction,
  listInput,
} from '../../shared/resource'
import { buildResourceApp } from '../../shared/resource-routes'

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

const webPageApi = buildResourceApp(pageResource, { tag: 'admin' })

export default webPageApi

function pageFields(): ResourceField[] {
  return [
    { key: 'title', label: '页面标题', required: true, type: 'text' },
    {
      help: '仅支持英文字母、数字、下划线和横线。',
      key: 'alias',
      label: '页面别名',
      pattern: aliasPattern.source,
      patternMessage: '页面别名只能包含英文字母、数字、下划线和横线。',
      required: true,
      type: 'text',
    },
    { key: 'category', label: '分类', type: 'text' },
    { key: 'summary', label: '摘要', type: 'textarea' },
    { key: 'content', label: '内容', required: true, type: 'richtext' },
  ]
}
