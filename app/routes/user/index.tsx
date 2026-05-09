import { createRoute } from 'honox/factory'

export default createRoute(async (c) => c.redirect(
  '/user/dashboard',
  302,
))
