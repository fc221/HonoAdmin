import { createRoute } from 'honox/factory'
import { logoutUser } from '../../service/user/logout'

const loginPath = '/user/login'

export const POST = createRoute(async (c) => {
  await logoutUser(c)
  return c.redirect(loginPath, 303)
})

export default createRoute(async (c) => {
  await logoutUser(c)
  return c.redirect(loginPath, 302)
})
