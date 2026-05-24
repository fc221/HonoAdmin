import type { WebNotificationRecord } from '../../../../../service/admin/web/notification/dto'
import { ConfirmActionModal } from '../../../-components/crud-action-modal'
import {
  returnToFieldName,
  withReturnToPath,
} from '../../../../-/utils/form'

interface Props {
  listHref: string
  notifications: WebNotificationRecord[]
}

export default function WebNotificationTable({
  listHref,
  notifications,
}: Props) {
  return (
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>别名</th>
            <th>配置</th>
            <th>内容</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((notification) => (
            <tr key={notification.id}>
              <td>{notification.id}</td>
              <td class="font-medium">{notification.title}</td>
              <td class="font-mono text-sm">{notification.alias}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  {notification.isTop === 1
                    ? <span class="badge badge-primary badge-sm">置顶</span>
                    : null}
                  {notification.isImportant === 1
                    ? <span class="badge badge-secondary badge-sm">弹窗</span>
                    : null}
                  {notification.isTop !== 1 && notification.isImportant !== 1
                    ? <span class="text-base-content/50">-</span>
                    : null}
                </div>
              </td>
              <td class="max-w-96 whitespace-normal text-sm text-base-content/70">
                {getTextPreview(notification.content)}
              </td>
              <td>
                <div class="flex flex-nowrap items-center justify-end gap-2">
                  <a
                    class="btn btn-link btn-xs"
                    href={`/announcement/${notification.alias}`}
                    target="_blank"
                  >
                    访问
                  </a>
                  <a
                    class="btn btn-link btn-xs"
                    data-turbo-frame="_top"
                    href={withReturnToPath(
                      `/admin/web/notification/edit?id=${notification.id}`,
                      listHref,
                    )}
                  >
                    编辑
                  </a>
                  <ConfirmActionModal
                    id={`notification-delete-${notification.id}`}
                    inputs={[
                      { name: 'intent', value: 'delete' },
                      { name: 'id', value: notification.id },
                      { name: returnToFieldName, value: listHref },
                    ]}
                    message={`公告「${notification.title}」删除后不可恢复。`}
                    title="删除公告"
                  />
                </div>
              </td>
            </tr>
          ))}
          {notifications.length === 0
            ? (
                <tr>
                  <td class="text-base-content/60" colspan={6}>
                    暂无公告。
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
