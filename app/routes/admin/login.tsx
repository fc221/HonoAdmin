import { createRoute } from 'honox/factory'

export { POST } from '../user/login'

export default createRoute(async (c) => {
  const url = new URL(c.req.url)
  return c.redirect(`/user/login${url.search}`, 302)
})
