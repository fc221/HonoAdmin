import { createRoute } from 'honox/factory'
import {
  csrfFieldName,
  csrfHeaderName,
  prepareCsrfToken,
} from '../service/security/csrf'

const csrfRefreshHeaderName = 'X-HonoAdmin-CSRF-Refresh'

export const GET = createRoute(async (c) => {
  if (c.req.header(csrfRefreshHeaderName) !== 'true') {
    return c.notFound()
  }

  const token = await prepareCsrfToken(c)

  c.header('Cache-Control', 'no-store')
  return c.json({
    csrf: {
      field: csrfFieldName,
      header: csrfHeaderName,
      token,
    },
    ok: true,
  })
})
