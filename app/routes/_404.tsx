import type { NotFoundHandler } from 'hono'
import ErrorPage from './-/components/error-page'

const handler: NotFoundHandler = (c) => {
  c.status(404)
  return c.render(
    <ErrorPage
      message="这个地址没有对应的页面，请检查路径是否正确，或回到首页重新进入。"
      path={c.req.path}
      status={404}
      title="页面不存在"
    />,
    { layout: false },
  )
}

export default handler
