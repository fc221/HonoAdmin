import { jsxRenderer } from 'hono/jsx-renderer'
import Layout from '../_components/_layout/$index'
import { isLayoutDisabled } from '../_utils/layout-render'
import { formatPageTitle } from '../_utils/site'
import { getUserLayoutData } from '../admin/_utils/layout'

export default jsxRenderer(async ({ children, Layout: DocumentLayout, ...options }, c) => {
  if (isLayoutDisabled(options)) {
    return <DocumentLayout>{children}</DocumentLayout>
  }

  const layout = await getUserLayoutData(c)
  const currentMenuName = options.currentMenuName ?? 'user.dashboard'

  return (
    <DocumentLayout>
      <Layout
        currentMenuName={currentMenuName}
        menus={layout.menus}
        siteTitle={layout.siteTitle}
        user={layout.user}
      >
        {options.pageTitle
          ? <title>{formatPageTitle(options.pageTitle, layout.siteTitle)}</title>
          : null}
        {children}
      </Layout>
    </DocumentLayout>
  )
})
