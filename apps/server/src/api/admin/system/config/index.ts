import type { AppEnv } from '@hono-admin/runtime'
import type {
  ConfigDefinition,
  ConfigRecord,
  ConfigType,
  ConfigValuesInput,
} from '../../../schema'
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
import { describeRoute, jsonResponse, validate } from '../../../shared/openapi'
import {
  createAction,
  deleteAction,
  editAction,
} from '../../../shared/resource'
import { buildResourceApp } from '../../../shared/resource-routes'

const configResource: ResourceDefinition = {
  actions: [createAction],
  columns: [
    ['id', 'ID'],
    ['configType', '类型'],
    ['configKey', '键名'],
    ['configValue', '值'],
    ['updatedAt', '更新时间'],
  ],
  create: async (c, input) => maskConfigRecord(await createConfig(c, input as never)),
  createFields: configFields,
  delete: deleteConfig,
  editFields: configFields,
  get: async (c, id) => maskConfigRecord(await getConfigById(c, id)),
  list: async (c) => (await listConfigs(c)).map(maskConfigRecord),
  rowActions: [editAction, deleteAction],
  title: '配置管理',
  update: updateConfigResource,
}

const systemConfigApi = new Hono<AppEnv>()
  .get(
    '/panel',
    describeRoute({
      tags: ['admin'],
      summary: '配置面板',
      responses: { 200: jsonResponse(configPanelPayloadSchema, '配置面板数据') },
    }),
    async (c) =>
      c.json(configPanelPayloadSchema.parse({
        configs: (await listConfigs(c)).map(maskConfigRecord),
        definitions: builtInConfigDefinitions.map(maskConfigDefinition),
        types: configTypeOptions,
      })),
  )
  .post(
    '/values',
    describeRoute({
      tags: ['admin'],
      summary: '批量更新配置值',
      responses: { 200: jsonResponse(resourceMutationSchema, '配置已更新') },
    }),
    validate('json', configValuesInputSchema),
    async (c) => {
      const input = c.req.valid('json')
      const safeInput = omitBlankSecretConfigValues(input)
      const updateCount = Object.keys(safeInput.values).length > 0
        ? await updateConfigValues(c, safeInput)
        : 0

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
    },
  )
  .route('/', buildResourceApp(configResource, { tag: 'admin' }))

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

async function updateConfigResource(
  c: Parameters<NonNullable<ResourceDefinition['update']>>[0],
  id: number,
  input: Record<string, unknown>,
): Promise<ConfigRecord> {
  const current = await getConfigById(c, id)
  const nextType = getConfigType(input.configType) ?? current.configType
  const nextKey = typeof input.configKey === 'string' ? input.configKey : current.configKey
  const nextInput = { ...input }

  if (nextInput.configValue === '' && isSecretConfig(nextType, nextKey)) {
    delete nextInput.configValue
  }

  if (Object.keys(nextInput).length === 0) {
    return maskConfigRecord(current)
  }

  return maskConfigRecord(await updateConfig(c, id, nextInput as never))
}

function maskConfigRecord(config: ConfigRecord): ConfigRecord {
  return isSecretConfig(config.configType, config.configKey)
    ? { ...config, configValue: '' }
    : config
}

function maskConfigDefinition(definition: ConfigDefinition): ConfigDefinition {
  return definition.inputType === 'password'
    ? { ...definition, configValue: '' }
    : definition
}

function omitBlankSecretConfigValues(input: ConfigValuesInput): ConfigValuesInput {
  return {
    ...input,
    values: Object.fromEntries(
      Object.entries(input.values).filter(([configKey, configValue]) =>
        configValue !== '' || !isSecretConfig(input.configType, configKey),
      ),
    ),
  }
}

function isSecretConfig(configType: ConfigType, configKey: string): boolean {
  return builtInConfigDefinitions.some((definition) =>
    definition.configType === configType
    && definition.configKey === configKey
    && definition.inputType === 'password'
  )
}

function getConfigType(value: unknown): ConfigType | null {
  return configTypeOptions.some((option) => option.value === value)
    ? value as ConfigType
    : null
}
