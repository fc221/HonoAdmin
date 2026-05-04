import type { Context } from 'hono'
import type { ConfigType } from '../../../../service'
import {
  configTypes,
  createRequestOperateLog,
  idParamSchema,
  updateConfig,
  updateConfigSchema,
} from '../../../../service'
import { ValidationError } from '../../../../utils'
import {
  getFormValue,
  respondWithActionAlert,
  respondWithActionError,
} from '../../../_utils/form'

const pagePath = '/admin/system/config'

export async function handleConfigAction(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const intent = getFormValue(body, 'intent')

  try {
    const configType = getConfigFormType(body)

    if (intent === 'update-values') {
      const updateCount = await updateConfigValues(c, body)

      await createRequestOperateLog(c, {
        logMsg: `更新${getConfigTypeLabel(configType)}配置 ${updateCount} 项`,
        logType: 'updateOne',
        method: 'handleConfigAction',
      })

      return respondWithActionAlert(c, pagePath, {
        message: '配置已更新。',
        type: 'success',
      })
    }

    throw new ValidationError('未知的配置操作。', { intent })
  } catch (error) {
    return respondWithActionError(c, pagePath, error)
  }
}

async function updateConfigValues(
  c: Context,
  body: Record<string, unknown>,
): Promise<number> {
  const configEntries = Object.keys(body)
    .filter((key) => key.startsWith('configValue:'))

  if (!configEntries.length) {
    throw new ValidationError('没有可更新的配置项。')
  }

  for (const key of configEntries) {
    await updateConfig(
      c,
      idParamSchema.parse({ id: key.slice('configValue:'.length) }).id,
      updateConfigSchema.parse({
        configValue: getFormValue(body, key),
      }),
    )
  }

  return configEntries.length
}

function getConfigFormType(body: Record<string, unknown>): ConfigType {
  const value = getFormValue(body, 'configType')

  if (configTypes.includes(value as ConfigType)) {
    return value as ConfigType
  }

  return 'site'
}

function getConfigTypeLabel(type: ConfigType): string {
  const labels: Record<ConfigType, string> = {
    file: '文件',
    site: '站点',
    system: '系统',
  }

  return labels[type]
}
