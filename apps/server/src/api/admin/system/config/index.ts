import type { AppEnv } from '@hono-admin/runtime'
import type { ResourceDefinition } from '../../../shared/resource'
import { Hono } from 'hono'
import {
  createConfig,
  deleteConfig,
  getConfigById,
  listConfigs,
  updateConfig,
  updateConfigValues,
} from '../../../../service/admin/system/config'
import {
  builtInConfigDefinitions,
  configTypeOptions,
} from '../../../../service/admin/system/config/constants'
import { createRequestOperateLog } from '../../../../service/admin/system/operate-log'
import {
  configPanelPayloadSchema,
  configValuesInputSchema,
  resourceMutationSchema,
} from '../../../schema'
import {
  createAction,
  createResource,
  deleteAction,
  deleteResource,
  editAction,
  getResourceDetail,
  listResource,
  resourceId,
  updateResource,
} from '../../../shared/resource'

const configResource: ResourceDefinition = {
  actions: [createAction],
  columns: [
    ['id', 'ID'],
    ['configType', '类型'],
    ['configKey', '键名'],
    ['configValue', '值'],
    ['updatedAt', '更新时间'],
  ],
  create: (c, input) => createConfig(c, input as never),
  createFields: configFields,
  delete: deleteConfig,
  editFields: configFields,
  get: getConfigById,
  list: (c) => listConfigs(c),
  rowActions: [editAction, deleteAction],
  title: '配置管理',
  update: (c, id, input) => updateConfig(c, id, input as never),
}

const systemConfigApi = new Hono<AppEnv>()

systemConfigApi.get('/panel', async (c) =>
  c.json(configPanelPayloadSchema.parse({
    configs: await listConfigs(c),
    definitions: builtInConfigDefinitions,
    types: configTypeOptions,
  })))

systemConfigApi.post('/values', async (c) => {
  const input = configValuesInputSchema.parse(await c.req.json())
  const updateCount = await updateConfigValues(c, input)

  await createRequestOperateLog(c, {
    logMsg: `更新${getConfigTypeLabel(input.configType)}配置 ${updateCount} 项`,
    logType: 'updateOne',
    method: 'updateConfigValues',
  })

  return c.json(resourceMutationSchema.parse({
    data: { count: updateCount },
    message: '配置已更新。',
    ok: true,
  }))
})

systemConfigApi.get('/', async (c) => c.json(await listResource(configResource, c)))
systemConfigApi.get('/:id', async (c) => c.json(await getResourceDetail(configResource, c, resourceId(c))))
systemConfigApi.post('/', async (c) => c.json(await createResource(configResource, c, await c.req.json())))
systemConfigApi.put('/:id', async (c) => c.json(await updateResource(configResource, c, resourceId(c), await c.req.json())))
systemConfigApi.delete('/:id', async (c) => c.json(await deleteResource(configResource, c, resourceId(c))))

export default systemConfigApi

function configFields() {
  return [
    { key: 'configType', label: '配置类型', options: ['site', 'system', 'file'].map((value) => ({ label: value, value })), required: true, type: 'select' as const },
    { key: 'configKey', label: '配置键', required: true, type: 'text' as const },
    { key: 'configValue', label: '配置值', required: true, type: 'textarea' as const },
  ]
}

function getConfigTypeLabel(type: string): string {
  const option = configTypeOptions.find((item) => item.value === type)
  return option?.label ?? '系统'
}
