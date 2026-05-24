import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import Layout from '../app/routes/-/components/layout'
import PageAlert from '../app/routes/-/components/page-alert'
import FileUploadDropzone from '../app/routes/admin/system/file/-components/file-upload-dropzone'
import RolePanel from '../app/routes/admin/system/role/-components/role-panel'
import UserForm from '../app/routes/admin/system/user/-components/user-form'
import WebNotificationPanel from '../app/routes/admin/web/notification/-components/notification-panel'
import WebPageForm from '../app/routes/admin/web/page/-components/page-form'
import WebPagePanel from '../app/routes/admin/web/page/-components/page-panel'

describe('server-first UI rendering', () => {
  test('layout renders Stimulus hooks while keeping existing shell classes', async () => {
    const html = await render(
      <Layout currentMenuName="admin.dashboard">
        <div>content</div>
      </Layout>,
    )

    expect(html).toContain('data-controller="layout"')
    expect(html).toContain('class="drawer lg:drawer-open h-full! min-w-0 overflow-x-hidden lg:gap-4"')
    expect(html).toContain('data-layout-aside-panel')
    expect(html).not.toContain('data-history-replace')
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
