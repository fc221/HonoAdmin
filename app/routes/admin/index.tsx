import { createRoute } from 'honox/factory'
import {
  getAdminSessionUser,
  getFirstAuthorizedAdminHref,
} from '../../service'

export default createRoute(async (c) => c.redirect(
  await getFirstAuthorizedAdminHref(c, await getAdminSessionUser(c)),
  302,
))
