import { createRoute } from 'honox/factory'
import { getUpdateStatus } from '../../../../service/admin/system/update'

export default createRoute(async (c) =>
  c.json({
    data: await getUpdateStatus(c),
    ok: true,
  }))
