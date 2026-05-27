import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import Layout from '../app/routes/-/components/layout'
import { hasCollapsibleSidebarVariant } from '../app/routes/-/components/layout/config'
import PageAlert from '../app/routes/-/components/page-alert'
import FileUploadDropzone from '../app/routes/admin/system/file/-components/file-upload-dropzone'
import RolePanel from '../app/routes/admin/system/role/-components/role-panel'
import UserForm from '../app/routes/admin/system/user/-components/user-form'
import WebNotificationPanel from '../app/routes/admin/web/notification/-components/notification-panel'
import WebPageForm from '../app/routes/admin/web/page/-components/page-form'
import WebPagePanel from '../app/routes/admin/web/page/-components/page-panel'

describe('server-first UI rendering', () => {
  test('hybrid layouts keep desktop sidebar collapse enabled', () => {
    expect(hasCollapsibleSidebarVariant('sidebar')).toBe(true)
    expect(hasCollapsibleSidebarVariant('hybrid')).toBe(true)
    expect(hasCollapsibleSidebarVariant('hybrid-flush')).toBe(true)
    expect(hasCollapsibleSidebarVariant('top-nav')).toBe(false)
  })

  test('hybrid layouts apply sidebar menu style on desktop', () => {
    const desktopCss = readFileSync('app/style.css', 'utf8')
      .split('@media (max-width: 1023.98px)')[0] ?? ''

    expect(desktopCss).toMatch(
      /data-layout-variant='hybrid'[\s\S]*data-layout-variant='hybrid-flush'[\s\S]*data-layout-sidebar-menu-style='plain'[\s\S]*\[data-layout-aside-menu-shell\][\s\S]*>\s*\.menu/,
    )
  })

  test('layout renders Stimulus hooks while keeping existing shell classes', async () => {
    const html = await render(
      <Layout currentMenuName="admin.dashboard">
        <div>content</div>
      </Layout>,
    )

    expect(html).toContain('data-controller="layout"')
    expect(html).toContain('class="drawer lg:drawer-open h-full! min-w-0 overflow-x-hidden lg:gap-4"')
    expect(html).toContain('data-layout-aside-panel')
    expect(html).toContain('data-controller="theme"')
    expect(html).toContain('class="btn btn-circle btn-ghost"')
    expect(html).toContain('popovertarget="aside-theme-dropdown"')
    expect(html).toContain('data-action="theme#select"')
    expect(html).toContain('data-theme-value="system"')
    expect(html).not.toContain('data-controller="settings"')
    expect(html).not.toContain('aria-label="界面设置"')
    expect(html).not.toContain('data-history-replace')
  })

  test('flush sidebar layout keeps the mobile drawer panel edge aligned', async () => {
    const html = await render(
      <Layout currentMenuName="admin.dashboard" variant="sidebar-flush">
        <div>content</div>
      </Layout>,
    )
    const panelHtml = getElementHtml(html, 'data-layout-aside-panel')

    expect(panelHtml).toContain('w-64 h-full rounded-none')
    expect(panelHtml).not.toContain('m-3')
    expect(panelHtml).not.toContain('h-[calc(100vh-2rem)]')
  })

  test('flush layouts keep the footer inset from the viewport edge', async () => {
    const defaultHtml = await render(
      <Layout currentMenuName="admin.dashboard">
        <div>content</div>
      </Layout>,
    )
    const flushHtml = await render(
      <Layout currentMenuName="admin.dashboard" variant="top-nav-flush">
        <div>content</div>
      </Layout>,
    )

    expect(defaultHtml).toContain('class="mt-auto px-4 pb-1 pt-3 text-center text-xs text-base-content/50"')
    expect(flushHtml).toContain('class="mt-auto px-4 pb-4 pt-3 text-center text-xs text-base-content/50"')
  })

  test('top nav layouts use the mobile sidebar drawer on small screens', async () => {
    const topNavHtml = await render(
      <Layout currentMenuName="admin.dashboard" variant="top-nav">
        <div>content</div>
      </Layout>,
    )
    const flushTopNavHtml = await render(
      <Layout currentMenuName="admin.dashboard" variant="top-nav-flush">
        <div>content</div>
      </Layout>,
    )
    const combinedHtml = `${topNavHtml}\n${flushTopNavHtml}`
    const topNavPanelHtml = getElementHtml(topNavHtml, 'data-layout-aside-panel')
    const flushTopNavPanelHtml = getElementHtml(flushTopNavHtml, 'data-layout-aside-panel')
    const desktopTopNavHtml = getSectionHtml(topNavHtml, 'class="hidden lg:block"', 'data-page-scroll')
    const desktopFlushTopNavHtml = getSectionHtml(flushTopNavHtml, 'class="hidden lg:block"', 'data-page-scroll')

    expect(combinedHtml.match(/id="aside-drawer"/g)?.length).toBe(2)
    expect(combinedHtml).toContain('class="lg:hidden"><header class="navbar w-full rounded-box bg-base-100 justify-between"')
    expect(combinedHtml).toContain('class="lg:hidden"><header class="navbar w-full bg-base-100 justify-between border-b border-base-200"')
    expect(combinedHtml).toContain('class="hidden lg:block"><header class="navbar relative w-full bg-base-100 rounded-box gap-3"')
    expect(combinedHtml).toContain('class="hidden lg:block"><header class="navbar relative w-full bg-base-100 border-b border-base-200 px-4 gap-3"')
    expect(topNavPanelHtml).toContain('rounded-box w-64 m-3 h-[calc(100vh-2rem)]')
    expect(flushTopNavPanelHtml).toContain('w-64 h-full rounded-none')
    expect(flushTopNavPanelHtml).not.toContain('m-3')
    expect(desktopTopNavHtml).not.toContain('aria-label="面包屑导航"')
    expect(desktopFlushTopNavHtml).not.toContain('aria-label="面包屑导航"')
    expect(combinedHtml).not.toContain('top-nav-mobile-drawer')
    expect(combinedHtml).not.toContain('aria-controls="top-nav-mobile-drawer"')
    expect(combinedHtml).not.toContain('class="btn btn-ghost btn-circle lg:hidden"')
    expect(combinedHtml).not.toContain('data-top-nav-mobile-menu')
    expect(combinedHtml).not.toContain('<span class="ml-2 text-sm">菜单</span>')
  })

  test('hybrid layouts render top header with side menu and main content', async () => {
    const html = await render(
      <Layout
        currentMenuName="admin.system.user"
        sidebarLogoStyle="plain"
        sidebarMenuStyle="plain"
        variant="hybrid"
      >
        <div>content</div>
      </Layout>,
    )
    const flushHtml = await render(
      <Layout currentMenuName="admin.system.user" variant="hybrid-flush">
        <div>content</div>
      </Layout>,
    )
    const desktopSideMenuHtml = getSectionHtml(
      html,
      'hidden lg:flex min-w-0 overflow-x-hidden"',
      'data-layout-menu-collapsed',
    )

    expect(html).toContain('data-layout-variant="hybrid"')
    expect(html).toContain('data-layout-main-width="wide"')
    expect(html).toContain('data-layout-sidebar-logo-style="plain"')
    expect(html).toContain('data-layout-sidebar-menu-style="plain"')
    expect(html).toContain('data-layout-top-menu-centered="false"')
    expect(html).toContain('data-layout-top-nav-bar')
    expect(html).not.toContain('top-menu-admin-system')
    expect(desktopSideMenuHtml).toContain('配置管理')
    expect(desktopSideMenuHtml).toContain('用户管理')
    expect(desktopSideMenuHtml).not.toContain('网站管理')
    expect(flushHtml).toContain('data-layout-variant="hybrid-flush"')
    expect(flushHtml).toContain('w-64 h-full rounded-none')
  })

  test('list panel renders a Turbo Frame with search and pagination targets', async () => {
    const html = await render(
      <WebPagePanel
        keyword=""
        pages={[]}
        pagination={{
          items: [],
          page: 1,
          pageSize: 10,
          total: 20,
          totalPages: 2,
        }}
      />,
    )

    expect(html).toContain('<turbo-frame id="admin-list-frame">')
    expect(html).toContain('class="rounded-box border border-base-300 bg-base-100 p-4"')
    expect(html).toContain('data-turbo-frame="admin-list-frame"')
    expect(html).toContain('data-turbo-action="replace"')
    expect(html).toContain('data-turbo-action="advance"')
  })

  test('standalone create and edit links leave the list frame', async () => {
    const roleHtml = await render(
      <RolePanel
        keyword=""
        pagination={{
          items: [],
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        }}
        roles={[{
          code: 'editor',
          createdAt: 1767225600000,
          description: null,
          id: 1,
          menuNames: [],
          name: '编辑员',
          permissionCodes: [],
          policies: [],
          updatedAt: 1767225600000,
        }]}
        timezone="UTC"
      />,
    )
    const pageHtml = await render(
      <WebPagePanel
        keyword=""
        pages={[{
          alias: 'about',
          category: null,
          content: '<p>关于我们</p>',
          createdAt: 1767225600000,
          id: 1,
          summary: null,
          title: '关于',
          updatedAt: 1767225600000,
        }]}
        pagination={{
          items: [],
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        }}
      />,
    )
    const notificationHtml = await render(
      <WebNotificationPanel
        keyword=""
        notifications={[{
          alias: 'notice',
          content: '<p>公告</p>',
          createdAt: 1767225600000,
          id: 1,
          isImportant: 0,
          isTop: 0,
          title: '公告',
          updatedAt: 1767225600000,
        }]}
        pagination={{
          items: [],
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        }}
      />,
    )

    expect(roleHtml).toContain('href="/admin/system/role/add?returnTo=')
    expect(roleHtml).toContain('href="/admin/system/role/edit?id=1&amp;returnTo=')
    expect(pageHtml).toContain('href="/admin/web/page/add?returnTo=')
    expect(pageHtml).toContain('href="/admin/web/page/edit?id=1&amp;returnTo=')
    expect(notificationHtml).toContain('href="/admin/web/notification/add?returnTo=')
    expect(notificationHtml).toContain('href="/admin/web/notification/edit?id=1&amp;returnTo=')
    const combinedHtml = [roleHtml, pageHtml, notificationHtml].join('\n')
    const topTargetCount = combinedHtml.match(/data-turbo-frame="_top"/g)
      ?.length
    expect(topTargetCount).toBeGreaterThanOrEqual(6)
    expect(combinedHtml).toContain('name="_returnTo"')
  })

  test('page alert renders toast markup with a Stimulus lifecycle hook', async () => {
    const html = await render(
      <PageAlert alert={{ message: '保存成功。', type: 'success' }} />,
    )

    expect(html).toContain('class="toast toast-top toast-end z-50 pointer-events-none"')
    expect(html).toContain('data-controller="page-alert"')
    expect(html).toContain('alert-success')
  })

  test('mutation forms submit as top-level Turbo replace visits', async () => {
    const html = await render(
      <>
        <WebPageForm mode="create" />
        <UserForm mode="create" roles={[]} />
      </>,
    )

    expect(html.match(/data-turbo="true"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html.match(/data-turbo-action="replace"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html.match(/data-turbo-frame="_top"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('pattern="^[A-Za-z0-9_.\\-]+$"')
  })

  test('file upload dropzone keeps Stimulus hooks for file selection', async () => {
    const html = await render(<FileUploadDropzone />)

    expect(html).toContain('data-controller="file-dropzone"')
    expect(html).toContain('change-&gt;file-dropzone#inputChanged')
    expect(html).toContain('click-&gt;file-dropzone#choose')
    expect(html).toContain('data-file-dropzone-target="grid"')
    expect(html).toContain('data-file-dropzone-target="input"')
  })
})

async function render(content: unknown): Promise<string> {
  const app = new Hono()
  app.get('/', async (c) => c.html(String(await content)))

  const response = await app.request('/')
  return response.text()
}

function getElementHtml(html: string, marker: string): string {
  const markerIndex = html.indexOf(marker)
  expect(markerIndex).toBeGreaterThanOrEqual(0)

  const elementStart = html.lastIndexOf('<', markerIndex)
  const elementEnd = html.indexOf('>', markerIndex)
  expect(elementStart).toBeGreaterThanOrEqual(0)
  expect(elementEnd).toBeGreaterThanOrEqual(0)

  return html.slice(elementStart, elementEnd + 1)
}

function getSectionHtml(html: string, startMarker: string, endMarker: string): string {
  const start = html.indexOf(startMarker)
  expect(start).toBeGreaterThanOrEqual(0)

  const end = html.indexOf(endMarker, start)
  expect(end).toBeGreaterThan(start)

  return html.slice(start, end)
}
