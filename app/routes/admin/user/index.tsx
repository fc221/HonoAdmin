import { createRoute } from 'honox/factory'
import { listUsers } from '../../../service'
import Layout from '../../_components/_layout/$index'
import UserPanel from './_components/$user-panel'

export default createRoute(async (c) => c.render(
  <Layout>
    <title>用户管理 - HonoAdmin</title>
    <UserPanel initialUsers={await listUsers(c.db)} />
  </Layout>,
))
