import { createRoute } from 'honox/factory'
import { listConfigs } from '../../../service'
import Layout from '../../_components/_layout/$index'
import ConfigPanel from './_components/$config-panel'

export default createRoute(async (c) => c.render(
  <Layout>
    <title>配置管理 - HonoAdmin</title>
    <ConfigPanel initialConfigs={await listConfigs(c.db)} />
  </Layout>,
))
