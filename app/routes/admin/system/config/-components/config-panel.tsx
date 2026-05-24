import type { PageAlertState } from '../../../../-/components/page-alert'
import type { ConfigRecord } from '../../../../../service/admin/system/config/dto'
import type { ConfigType } from '../../../../../service/admin/system/config/enum'
import PageAlert from '../../../../-/components/page-alert'
import RadioTabs from '../../../../-/components/radio-tabs'
import { configTypeOptions } from '../../../../../service/admin/system/config/constants'
import ConfigTypeForm from './config-type-form'

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
              allConfigs={configs}
              configs={configs.filter(
                (config) => config.configType === option.value,
              )}
              key={option.value}
              label={option.label}
              type={option.value}
            />
          ))}
        </RadioTabs>
      </div>
    </div>
  )
}
