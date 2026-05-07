import type { WebNotificationRecord } from '../../../../../service/admin/web/notification/dto'
import RichTextEditor from '../../../../_components/_rich-text-editor'

interface Props {
  mode: 'create' | 'update'
  notification?: WebNotificationRecord
}

export default function WebNotificationForm({
  mode,
  notification,
}: Props) {
  const isUpdate = mode === 'update'

  return (
    <form
      class="space-y-5"
      data-pjax="true"
      data-validate-trigger="blur"
      method="post"
    >
      <input name="intent" type="hidden" value={mode} />
      {isUpdate && notification
        ? <input name="id" type="hidden" value={notification.id} />
        : null}
      <div class="grid gap-4 lg:grid-cols-2">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">公告标题</legend>
          <input
            class="input w-full"
            maxlength={255}
            name="title"
            placeholder="请输入公告标题"
            required
            value={notification?.title ?? ''}
          />
          <p class="label">展示在公告详情和后台列表中。</p>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">公告别名</legend>
          <input
            class="input w-full font-mono"
            maxlength={255}
            name="alias"
            pattern="^[\\w.-]+$"
            placeholder="release-note"
            required
            value={notification?.alias ?? ''}
          />
          <p class="label">用于生成访问路径，只允许字母、数字、点、横线和下划线。</p>
        </fieldset>

        <fieldset class="fieldset lg:col-span-2">
          <legend class="fieldset-legend">公告配置</legend>
          <div class="flex flex-wrap gap-4 rounded-box border border-base-300 bg-base-100 p-3">
            <label class="label cursor-pointer justify-start gap-2">
              <input
                checked={notification?.is_top === 1}
                class="checkbox checkbox-primary checkbox-sm"
                name="isTop"
                type="checkbox"
              />
              <span class="label-text">置顶</span>
            </label>
            <label class="label cursor-pointer justify-start gap-2">
              <input
                checked={notification?.is_important === 1}
                class="checkbox checkbox-primary checkbox-sm"
                name="isImportant"
                type="checkbox"
              />
              <span class="label-text">弹窗</span>
            </label>
          </div>
          <p class="label">用于控制公告在前台或列表中的展示策略。</p>
        </fieldset>

        <RichTextEditor
          label="公告内容"
          name="content"
          placeholder="请输入公告内容"
          uploadType="notification"
          value={notification?.content ?? ''}
        />
      </div>

      <div class="flex justify-end gap-2 border-t border-base-300 pt-4">
        <a
          class="btn btn-ghost btn-sm"
          data-pjax="true"
          href="/admin/web/notification"
        >
          取消
        </a>
        <button class="btn btn-primary btn-sm" type="submit">
          {isUpdate ? '保存公告' : '创建公告'}
        </button>
      </div>
    </form>
  )
}
