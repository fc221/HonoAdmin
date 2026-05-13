import type { ConfigRecord } from '../../../../../service/admin/system/config/dto'
import type { ConfigType } from '../../../../../service/admin/system/config/enum'
import type { PageAlertState } from '../../../../_components/$page-alert'
import {
  builtInConfigDefinitions,
  configTypeOptions,
} from '../../../../../service/admin/system/config/constants'
import PageAlert from '../../../../_components/$page-alert'
import RadioTabs from '../../../../_components/_radio-tabs'
import { selectedOptionAttrs } from '../../../../_utils/form'

interface Props {
  activeType: ConfigType
  alert?: PageAlertState
  configs: ConfigRecord[]
}

export default function ConfigPanel({ activeType, alert, configs }: Props) {
  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <div class="overflow-x-auto">
        <RadioTabs
          activeValue={activeType}
          name="config_type_tabs"
          tabs={configTypeOptions}
        >
          {configTypeOptions.map((option) => (
            <ConfigTypeForm
              configs={configs.filter(
                (config) => config.configType === option.value,
              )}
              label={option.label}
              type={option.value}
            />
          ))}
        </RadioTabs>
      </div>
    </div>
  )
}

function ConfigTypeForm({
  configs,
  label,
  type,
}: {
  configs: ConfigRecord[]
  label: string
  type: ConfigType
}) {
  return (
    <form
      class="space-y-4"
      data-validate-trigger="blur"
      method="post"
    >
      <input name="configType" type="hidden" value={type} />
      <div class={`grid gap-4 ${configs.length < 5 ? 'md:grid-cols-1 w-1/2' : 'md:grid-cols-2'}`}>
        {configs.map((config) => (
          <ConfigValueField config={config} key={config.id} />
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

function ConfigValueField({ config }: { config: ConfigRecord }) {
  const definition = builtInConfigDefinitions.find(
    (item) =>
      item.configType === config.configType
      && item.configKey === config.configKey,
  )

  return (
    <fieldset class="fieldset">
      <legend class="fieldset-legend">
        {definition?.label ?? config.configKey}
      </legend>
      {definition?.inputType === 'select' && definition.options?.length
        ? (
            <select
              class="select w-full"
              name={`configValue:${config.id}`}
              value={config.configValue}
            >
              {definition.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  {...selectedOptionAttrs(config.configValue === option.value)}
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
                maxlength={4000}
                name={`configValue:${config.id}`}
                placeholder={`请输入${definition.label}`}
                rows={4}
              >
                {config.configValue}
              </textarea>
            )
          : (
              <input
                class="input w-full"
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
                value={config.configValue}
              />
            )}
      <p class="label whitespace-normal">
        {definition?.description ?? `配置键：${config.configKey}`}
      </p>
    </fieldset>
  )
}
