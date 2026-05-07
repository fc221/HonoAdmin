import { createRoute } from 'honox/factory'
import { getAdminSessionUser } from '../../service/admin/session'
import { isAdminInstalled } from '../../service/admin/system/user'

const loginPath = '/user/login'
const publicPaths = new Set([loginPath])

export default createRoute(async (c, next) => {
  if (!await isAdminInstalled(c)) {
    return c.redirect('/install', 302)
  }

  if (publicPaths.has(c.req.path)) {
    await next()
    return
  }

  if (!await getAdminSessionUser(c)) {
    const url = new URL(c.req.url)
    const query = new URLSearchParams({
      returnTo: `${url.pathname}${url.search}`,
    })
    return c.redirect(`${loginPath}?${query}`, 302)
  }

  await next()
})
