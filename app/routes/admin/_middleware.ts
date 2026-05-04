import type { Context } from 'hono'
import { createRoute } from 'honox/factory'
import {
  canAccessAdminPath,
  getAdminSessionUser,
  isAdminInstalled,
} from '../../service'

const publicPaths = new Set(['/admin/login'])
const loginPath = '/user/login'

export default createRoute(async (c, next) => {
  if (!await isAdminInstalled(c)) {
    return c.redirect('/install', 302)
  }

  if (publicPaths.has(c.req.path)) {
    await next()
    return
  }

  const user = await getAdminSessionUser(c)

  if (!user) {
    const url = new URL(c.req.url)
    const query = new URLSearchParams({
      returnTo: `${url.pathname}${url.search}`,
    })
    return c.redirect(`${loginPath}?${query}`, 302)
  }

  if (
    !await canAccessAdminPath(
      c,
      user,
      c.req.path,
      c.req.method,
      await getRequestActionKey(c),
    )
  ) {
    return c.text('没有权限访问该后台功能。', 403)
  }

  await next()
})

async function getRequestActionKey(c: Context) {
  if (c.req.method !== 'POST') {
    return '*'
  }

  try {
    const formData = await c.req.raw.clone().formData()
    const intent = formData.get('intent')
    return typeof intent === 'string' && intent.trim() ? intent : '*'
  } catch {
    return '*'
  }
}
