import { createRoute } from 'honox/factory'
import ErrorPage from '../-/components/error-page'
import { getSiteConfig } from '../../service/admin/system/config'
import { getWebPageByAlias } from '../../service/admin/web/page'
import { NotFoundError } from '../../utils/errors'
import { sanitizeRichTextHtml } from '../../utils/html'

export default createRoute(async (c) => {
  try {
    const alias = c.req.param('alias')
    if (!alias) {
      c.status(404)
      return c.render(
        <ErrorPage
          message="页面别名为空，无法定位要访问的内容。"
          path={c.req.path}
          status={404}
          title="页面不存在"
        />,
      )
    }

    const [page, siteConfig] = await Promise.all([
      getWebPageByAlias(c, alias),
      getSiteConfig(c),
    ])

    return c.render(
      <main class="min-h-screen bg-base-200 px-4 py-10 text-base-content">
        <title>{`${page.title} - ${siteConfig.title}`}</title>
        {siteConfig.description
          ? <meta name="description" content={siteConfig.description} />
          : null}
        {siteConfig.keywords
          ? <meta name="keywords" content={siteConfig.keywords} />
          : null}
        <article class="mx-auto max-w-3xl rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
          {page.category
            ? <p class="text-sm font-medium text-primary">{page.category}</p>
            : null}
          <h1 class="mt-2 text-3xl font-bold">{page.title}</h1>
          {page.summary
            ? <p class="mt-3 text-base text-base-content/60">{page.summary}</p>
            : null}
          <div
            class="rich-text-content mt-6 leading-7"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichTextHtml(page.content),
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
          title="页面不存在"
        />,
      )
    }

    throw error
  }
})
