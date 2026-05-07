import { createRoute } from 'honox/factory'
import { getAdminSessionUser } from '../../service/admin/session'
import { getFirstAuthorizedAdminHref } from '../../service/admin/system/role'

export default createRoute(async (c) => c.redirect(
  await getFirstAuthorizedAdminHref(c, await getAdminSessionUser(c)),
  302,
))
