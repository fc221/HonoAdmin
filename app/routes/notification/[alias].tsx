import { createRoute } from 'honox/factory'
import { getSiteConfig, getWebNotificationByAlias } from '../../service'
import { NotFoundError, sanitizeRichTextHtml } from '../../utils'
import ErrorPage from '../_components/_error-page'

export default createRoute(async (c) => {
  try {
    const alias = c.req.param('alias')
    if (!alias) {
      c.status(404)
      return c.render(
        <ErrorPage
          message="公告别名为空，无法定位要访问的内容。"
          path={c.req.path}
          status={404}
          title="公告不存在"
        />,
      )
    }

    const [announcement, siteConfig] = await Promise.all([
      getWebNotificationByAlias(c, alias),
      getSiteConfig(c),
    ])

    return c.render(
      <main class="min-h-screen bg-base-200 px-4 py-10 text-base-content">
        <title>{`${announcement.title} - ${siteConfig.title}`}</title>
        {siteConfig.description
          ? <meta name="description" content={siteConfig.description} />
          : null}
        {siteConfig.keywords
          ? <meta name="keywords" content={siteConfig.keywords} />
          : null}
        <article class="mx-auto max-w-3xl rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
          <div class="flex flex-wrap items-center gap-2">
            {announcement.is_top === 1
              ? <span class="badge badge-primary">置顶</span>
              : null}
            {announcement.is_important === 1
              ? <span class="badge badge-secondary">弹窗</span>
              : null}
          </div>
          <h1 class="mt-3 text-3xl font-bold">{announcement.title}</h1>
          <div
            class="rich-text-content mt-6 leading-7"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichTextHtml(announcement.content),
            }}
          />
        </article>
      </main>,
    )
  } catch (error) {
    if (error instanceof NotFoundError) {
      c.status(404)
      return c.render(
        <ErrorPage
          message={error.message}
          path={c.req.path}
          status={404}
          title="公告不存在"
        />,
      )
    }

    throw error
  }
})
