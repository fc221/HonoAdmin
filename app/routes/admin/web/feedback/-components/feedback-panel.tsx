import type { PageAlertState } from '../../../../-/components/page-alert'
import type { WebFeedbackRecord } from '../../../../../service/admin/web/feedback/dto'
import type { PaginatedResult } from '../../../../../service/common/pagination'
import { ConfirmActionModal } from '../../../-components/crud-action-modal'
import CsrfField from '../../../../-/components/csrf-field'
import PageAlert from '../../../../-/components/page-alert'
import Pagination, { createPageHref } from '../../../../-/components/pagination'
import TableSearchForm from '../../../../-/components/table-search-form'
import {
  ListTurboFrame,
  topLevelFormTurboAttrs,
} from '../../../../-/components/turbo-frame'
import { returnToFieldName } from '../../../../-/utils/form'
import { webFeedbackStatusOptions } from '../../../../../service/admin/web/feedback/enum'

interface Props {
  alert?: PageAlertState
  feedbacks: WebFeedbackRecord[]
  keyword: string
  pagination: PaginatedResult<WebFeedbackRecord>
}

export default function WebFeedbackPanel({
  alert,
  feedbacks,
  keyword,
  pagination,
}: Props) {
  const listHref = createPageHref('/admin/web/feedback', {
    keyword,
    pageSize: pagination.pageSize,
  }, pagination.page)

  return (
    <div class="space-y-4">
      <PageAlert alert={alert} />
      <ListTurboFrame>
        <section class="rounded-box border border-base-300 bg-base-100 p-4">
          <div class="mb-4 flex flex-wrap items-center justify-end gap-3">
            <TableSearchForm
              action="/admin/web/feedback"
              keyword={keyword}
              pageSize={pagination.pageSize}
              placeholder="标题 / 联系方式 / 状态"
            />
          </div>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>标题</th>
                  <th>内容</th>
                  <th>联系方式</th>
                  <th>图片</th>
                  <th>状态</th>
                  <th>回复</th>
                  <th class="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((feedback) => (
                  <tr key={feedback.id}>
                    <td>{feedback.id}</td>
                    <td class="min-w-40">{feedback.title}</td>
                    <td class="min-w-72 whitespace-pre-wrap">{feedback.content}</td>
                    <td>{feedback.contact ?? '-'}</td>
                    <td>
                      <div class="flex min-w-40 flex-col gap-1">
                        {parseFeedbackImages(feedback.images).map((image) => (
                          <a class="link link-primary" href={image} target="_blank">
                            {image}
                          </a>
                        ))}
                        {parseFeedbackImages(feedback.images).length === 0 ? '-' : null}
                      </div>
                    </td>
                    <td>
                      <form
                        data-validate-trigger="change"
                        id={`feedback-update-${feedback.id}`}
                        method="post"
                        {...topLevelFormTurboAttrs}
                      >
                        <CsrfField />
                        <input name={returnToFieldName} type="hidden" value={listHref} />
                        <input name="intent" type="hidden" value="update" />
                        <input name="id" type="hidden" value={feedback.id} />
                        <select
                          class="select select-bordered select-sm min-w-28"
                          name="status"
                        >
                          {webFeedbackStatusOptions.map((option) => (
                            <option
                              key={option.value}
                              selected={feedback.status === option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </form>
                    </td>
                    <td>
                      <textarea
                        class="textarea textarea-bordered textarea-sm min-h-20 min-w-72"
                        form={`feedback-update-${feedback.id}`}
                        maxlength={4000}
                        name="reply"
                      >
                        {feedback.reply ?? ''}
                      </textarea>
                    </td>
                    <td class="text-right">
                      <div class="flex flex-nowrap items-center justify-end gap-2">
                        <button
                          class="btn btn-link btn-xs"
                          form={`feedback-update-${feedback.id}`}
                          type="submit"
                        >
                          保存
                        </button>
                        <ConfirmActionModal
                          id={`feedback-delete-${feedback.id}`}
                          inputs={[
                            { name: 'intent', value: 'delete' },
                            { name: 'id', value: feedback.id },
                            { name: returnToFieldName, value: listHref },
                          ]}
                          message={`反馈「${feedback.title}」删除后不可恢复。`}
                          title="删除反馈"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {feedbacks.length === 0
                  ? (
                      <tr>
                        <td class="text-base-content/60" colspan={8}>
                          暂无反馈。
                        </td>
                      </tr>
                    )
                  : null}
              </tbody>
            </table>
          </div>
          <Pagination
            action="/admin/web/feedback"
            pagination={pagination}
            query={{ keyword, pageSize: pagination.pageSize }}
          />
        </section>
      </ListTurboFrame>
    </div>
  )
}

function parseFeedbackImages(value: string | null): string[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
}
