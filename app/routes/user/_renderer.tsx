import { jsxRenderer } from 'hono/jsx-renderer'
import Layout from '../_components/_layout/$index'
import {
  getUserLayoutData,
  isLayoutDisabled,
} from '../_utils/layout'
import { formatPageTitle } from '../_utils/site'

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
