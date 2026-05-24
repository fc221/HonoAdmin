import { jsxRenderer } from 'hono/jsx-renderer'
import Layout from '../-/components/layout/index'
import {
  getAdminLayoutData,
  isLayoutDisabled,
} from '../-/utils/layout'
import { formatPageTitle } from '../-/utils/site'

export default jsxRenderer(async ({ children, Layout: DocumentLayout, ...options }, c) => {
  if (isLayoutDisabled(options)) {
    return <DocumentLayout>{children}</DocumentLayout>
  }

  const layout = await getAdminLayoutData(c)
  const currentMenuName = options.currentMenuName ?? 'admin.dashboard'

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
