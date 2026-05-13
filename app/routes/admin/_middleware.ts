import type { Context } from 'hono'
import { createRoute } from 'honox/factory'
import { getAdminSessionUser } from '../../service/admin/session'
import { canAccessAdminPath } from '../../service/admin/system/role'
import { isAdminInstalled } from '../../service/admin/system/user'

const publicPaths = new Set(['/admin/login'])
const loginPath = '/user/login'

export default createRoute(async (c, next) => {
  if (publicPaths.has(c.req.path)) {
    await next()
    return
  }

  if (!await isAdminInstalled(c)) {
    return c.redirect('/install', 302)
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
