import type { ConfigRecord, ConfigType } from '../../../../../service'
import type { PageAlertState } from '../../../../_components/_page-alert'
import {
  builtInConfigDefinitions,
  configTypeOptions,
} from '../../../../../service'
import PageAlert from '../../../../_components/_page-alert'

interface Props {
  alert?: PageAlertState
  configs: ConfigRecord[]
}

export default function ConfigPanel({ alert, configs }: Props) {
  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <div class="overflow-x-auto">
        <div class="tabs tabs-lift">
          {configTypeOptions.map((option, index) => (
            <>
              <input
                aria-label={option.label}
                checked={index === 0}
                class="tab z-1"
                name="config_type_tabs"
                type="radio"
                value={option.value}
              />
              <div class="sticky start tab-content border-base-300 bg-base-100 p-6">
                <ConfigTypeForm
                  configs={configs.filter(
                    (config) => config.configType === option.value,
                  )}
                  label={option.label}
                  type={option.value}
                />
              </div>
            </>
          ))}
        </div>
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
      data-pjax="true"
      data-validate-trigger="blur"
      method="post"
    >
      <input name="configType" type="hidden" value={type} />
      <div class="grid gap-4 md:grid-cols-2">
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
            <select class="select w-full" name={`configValue:${config.id}`}>
              {definition.options.map((option) => (
                <option
                  key={option.value}
                  selected={config.configValue === option.value}
                  value={option.value}
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
      <p class="label">
        {definition?.description ?? `配置键：${config.configKey}`}
      </p>
    </fieldset>
  )
}
