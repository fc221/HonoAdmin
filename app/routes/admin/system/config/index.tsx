import { createRoute } from 'honox/factory'
import { getPageAlert } from '../../../-/utils/form'
import { listConfigs } from '../../../../service/admin/system/config'
import { configTypes } from '../../../../service/admin/system/config/enum'
import { handleConfigAction } from './-actions'
import ConfigPanel from './-components/config-panel'

export const POST = createRoute(handleConfigAction)

export default createRoute(async (c) => {
  const activeConfigType = getActiveConfigType(c.req.query('configType'))

  return c.render(
    <ConfigPanel
      activeType={activeConfigType}
      alert={getPageAlert(c)}
      configs={await listConfigs(c)}
    />,
    {
      currentMenuName: 'admin.system.config',
      pageTitle: '配置管理',
    },
  )
})

function getActiveConfigType(value: string | undefined) {
  return configTypes.includes(value as (typeof configTypes)[number])
    ? value as (typeof configTypes)[number]
    : 'site'
}
