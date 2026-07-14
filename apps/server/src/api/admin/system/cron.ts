import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceField } from '../../schema'
import type { ResourceDefinition } from '../../shared/resource'
import { Hono } from 'hono'
import {
  createScheduledJob,
  deleteScheduledJob,
  getScheduledJobForEdit,
  listScheduledJobs,
  runScheduledJobById,
  updateScheduledJob,
} from '../../../service/admin/system/cron'
import { listJobHandlerKeys } from '../../../service/admin/system/cron/registry'
import { describeRoute, jsonResponse, validate } from '../../shared/openapi'
import {
  createAction,
  deleteAction,
  editAction,
  listInput,
  mutationResult,
} from '../../shared/resource'
import { buildResourceApp } from '../../shared/resource-routes'
import {
  resourceIdParamSchema,
  resourceMutationSchema,
} from '../../shared/resource-schema'

const scheduledJobResource: ResourceDefinition = {
  actions: [createAction],
  columns: [
    ['id', 'ID'],
    ['name', '任务名称'],
    ['expression', '表达式'],
    ['handlerKey', '处理器'],
    ['status', '状态'],
    ['isRunning', '执行中'],
    ['lastStatus', '上次结果'],
    ['lastRunAt', '上次执行'],
    ['nextRunAt', '下次执行'],
  ],
  create: (c, input) => createScheduledJob(c, input),
  createFields: scheduledJobFields,
  delete: deleteScheduledJob,
  editFields: scheduledJobFields,
  extraRowKeys: ['description'],
  get: getScheduledJobForEdit,
  list: (c) => listScheduledJobs(c, listInput(c)),
  rowActions: [{ key: 'run', label: '执行' }, editAction, deleteAction],
  title: '定时任务',
  update: (c, id, input) => updateScheduledJob(c, id, input),
}

const systemCronApi = new Hono<AppEnv>()
  .post(
    '/:id/run',
    describeRoute({
      tags: ['admin'],
      summary: '手动执行定时任务',
      responses: { 200: jsonResponse(resourceMutationSchema, '执行结果') },
    }),
    validate('param', resourceIdParamSchema),
    async (c) => {
      const outcome = await runScheduledJobById(c, c.req.valid('param').id)
      return c.json(mutationResult(outcome.message, null))
    },
  )
  .route('/', buildResourceApp(scheduledJobResource, { tag: 'admin' }))

export default systemCronApi

function scheduledJobFields(): ResourceField[] {
  return [
    { key: 'name', label: '任务名称', required: true, type: 'text' },
    {
      help: '标准 5 段 cron,按应用时区计算,如 0 3 * * *',
      key: 'expression',
      label: 'cron 表达式',
      placeholder: '0 3 * * *',
      required: true,
      type: 'text',
    },
    {
      key: 'handlerKey',
      label: '任务处理器',
      options: listJobHandlerKeys().map((key) => ({ label: key, value: key })),
      required: true,
      type: 'select',
    },
    {
      key: 'params',
      label: '执行参数',
      placeholder: '多个参数用逗号分隔',
      type: 'text',
    },
    {
      defaultValue: 'active',
      key: 'status',
      label: '状态',
      options: [
        { label: '启用', value: 'active' },
        { label: '禁用', value: 'inactive' },
      ],
      type: 'select',
    },
    { key: 'description', label: '描述', type: 'textarea' },
  ]
}
