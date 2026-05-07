import { createRoute } from 'honox/factory'
import { listConfigs } from '../../../../service/admin/system/config'
import Layout from '../../../_components/_layout/$index'
import { getPageAlert } from '../../../_utils/form'
import { getAdminLayoutData } from '../../_utils/layout'
import { handleConfigAction } from './_actions'
import ConfigPanel from './_components/_config-panel'

export const POST = createRoute(handleConfigAction)

export default createRoute(async (c) => {
  const layout = await getAdminLayoutData(c)

  return c.render(
    <Layout
      canSwitchRole={layout.canSwitchRole}
      currentMenuName="admin.system.config"
      menus={layout.menus}
      siteTitle={layout.siteTitle}
      user={layout.user}
    >
      <title>{`配置管理 - ${layout.siteTitle}`}</title>
      <ConfigPanel
        alert={getPageAlert(c)}
        configs={await listConfigs(c)}
      />
    </Layout>,
  )
})
