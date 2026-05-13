import { createRoute } from 'honox/factory'
import { listConfigs } from '../../../../service/admin/system/config'
import { configTypes } from '../../../../service/admin/system/config/enum'
import { getPageAlert } from '../../../_utils/form'
import { handleConfigAction } from './_actions'
import ConfigPanel from './_components/_config-panel'

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
