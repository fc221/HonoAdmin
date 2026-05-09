import type { WebPageRecord } from '../../../../../service/admin/web/page/dto'
import { ConfirmActionModal } from '../../../_components/_crud-action-modal'

interface Props {
  pages: WebPageRecord[]
}

export default function WebPageTable({ pages }: Props) {
  return (
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>别名</th>
            <th>分类</th>
            <th>摘要</th>
            <th>内容</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id}>
              <td>{page.id}</td>
              <td class="font-medium">{page.title}</td>
              <td class="font-mono text-sm">{page.alias}</td>
              <td>{page.category ?? '-'}</td>
              <td class="max-w-64 whitespace-normal text-sm text-base-content/70">
                {page.summary ?? '-'}
              </td>
              <td class="max-w-80 whitespace-normal text-sm text-base-content/70">
                {getTextPreview(page.content)}
              </td>
              <td>
                <div class="flex flex-nowrap items-center justify-end gap-2">
                  <a
                    class="btn btn-link btn-xs"
                    href={`/page/${page.alias}`}
                    target="_blank"
                  >
                    访问
                  </a>
                  <a
                    class="btn btn-link btn-xs"
                    href={`/admin/web/page/edit?id=${page.id}`}
                  >
                    编辑
                  </a>
                  <ConfirmActionModal
                    id={`page-delete-${page.id}`}
                    inputs={[
                      { name: 'intent', value: 'delete' },
                      { name: 'id', value: page.id },
                    ]}
                    message={`页面「${page.title}」删除后不可恢复。`}
                    title="删除页面"
                  />
                </div>
              </td>
            </tr>
          ))}
          {pages.length === 0
            ? (
                <tr>
                  <td class="text-base-content/60" colspan={7}>
                    暂无页面。
                  </td>
                </tr>
              )
            : null}
        </tbody>
      </table>
    </div>
  )
}

function getTextPreview(value: string): string {
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) {
    return '-'
  }

  return text.length > 80 ? `${text.slice(0, 80)}...` : text
}
