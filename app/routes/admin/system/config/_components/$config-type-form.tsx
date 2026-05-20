import type {
  BuiltInConfigDefinition,
  ConfigValueMap,
} from '../../../../../service/admin/system/config/constants'
import type { ConfigRecord } from '../../../../../service/admin/system/config/dto'
import type { ConfigType } from '../../../../../service/admin/system/config/enum'
import { useMemo, useState } from 'hono/jsx'
import {
  builtInConfigDefinitions,
  isConfigDefinitionVisible,
} from '../../../../../service/admin/system/config/constants'
import { selectedOptionAttrs } from '../../../../_utils/form'

interface Props {
  allConfigs: ConfigRecord[]
  configs: ConfigRecord[]
  label: string
  type: ConfigType
}

export default function ConfigTypeForm({
  allConfigs,
  configs,
  label,
  type,
}: Props) {
  const initialConfigValues = useMemo(
    () => createConfigValueMap(allConfigs),
    [allConfigs],
  )
  const [configValues, setConfigValues] = useState(initialConfigValues)

  const updateConfigValue = (configKey: string, configValue: string) => {
    setConfigValues((values) => ({
      ...values,
      [configKey]: configValue,
    }))
  }

  return (
    <form
      class="space-y-4"
      data-validate-trigger="blur"
      method="post"
      onReset={() => setConfigValues(initialConfigValues)}
    >
      <input name="configType" type="hidden" value={type} />
      <div class="grid grid-cols-1 gap-4">
        {configs.map((config) => (
          <ConfigValueField
            config={config}
            configValues={configValues}
            key={config.id}
            onChange={updateConfigValue}
          />
        ))}
        {configs.length === 0
          ? (
              <p class="text-sm text-base-content/60">
                暂无
                {label}
                配置。
              </p>
            )
          : null}
      </div>
      {configs.length
        ? (
            <div class="flex justify-start border-t border-base-300 pt-4">
              <button class="btn btn-ghost btn-sm" type="reset">
                还原
              </button>
              <button
                class="ml-2 btn btn-primary btn-sm"
                name="intent"
                type="submit"
                value="update-values"
              >
                保存配置
              </button>
            </div>
          )
        : null}
    </form>
  )
}

function ConfigValueField({
  config,
  configValues,
  onChange,
}: {
  config: ConfigRecord
  configValues: ConfigValueMap
  onChange: (configKey: string, configValue: string) => void
}) {
  const definition = getConfigDefinition(config)
  const currentValue = configValues[config.configKey] ?? config.configValue
  const isVisible = isConfigDefinitionVisible(definition, configValues)

  return (
    <fieldset
      class={[
        'fieldset w-full! min-w-0',
        isVisible ? '' : 'hidden',
      ].filter(Boolean).join(' ')}
      data-config-field="true"
      data-config-key={config.configKey}
    >
      <legend class="fieldset-legend">
        {definition?.label ?? config.configKey}
      </legend>
      {definition?.inputType === 'select' && definition.options?.length
        ? (
            <select
              class="select w-full"
              data-config-key={config.configKey}
              name={`configValue:${config.id}`}
              value={currentValue}
              onChange={(event) =>
                onChange(
                  config.configKey,
                  (event.currentTarget as HTMLSelectElement).value,
                )}
            >
              {definition.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  {...selectedOptionAttrs(currentValue === option.value)}
                >
                  {option.label}
                </option>
              ))}
            </select>
          )
        : definition?.inputType === 'textarea'
          ? (
              <textarea
                class="textarea w-full"
                data-config-key={config.configKey}
                maxlength={4000}
                name={`configValue:${config.id}`}
                placeholder={`请输入${definition.label}`}
                rows={4}
                value={currentValue}
                onInput={(event) =>
                  onChange(
                    config.configKey,
                    (event.currentTarget as HTMLTextAreaElement).value,
                  )}
              >
                {currentValue}
              </textarea>
            )
          : (
              <input
                class="input w-full"
                data-config-key={config.configKey}
                maxlength={4000}
                name={`configValue:${config.id}`}
                placeholder={`请输入${definition?.label ?? config.configKey}`}
                type={
                  definition?.inputType === 'password'
                    ? 'password'
                    : definition?.inputType === 'number'
                      ? 'number'
                      : 'text'
                }
                value={currentValue}
                onInput={(event) =>
                  onChange(
                    config.configKey,
                    (event.currentTarget as HTMLInputElement).value,
                  )}
              />
            )}
      <p class="label whitespace-normal">
        {definition?.description ?? `配置键：${config.configKey}`}
      </p>
    </fieldset>
  )
}

function createConfigValueMap(configs: ConfigRecord[]): ConfigValueMap {
  const values = Object.fromEntries(
    builtInConfigDefinitions.map((definition) => [
      definition.configKey,
      definition.configValue,
    ]),
  ) as ConfigValueMap

  for (const config of configs) {
    values[config.configKey] = config.configValue
  }

  return values
}

function getConfigDefinition(
  config: ConfigRecord,
): BuiltInConfigDefinition | undefined {
  return builtInConfigDefinitions.find(
    (item) =>
      item.configType === config.configType
      && item.configKey === config.configKey,
  )
}
