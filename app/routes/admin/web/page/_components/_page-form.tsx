import type { WebPageRecord } from '../../../../../service/admin/web/page/dto'
import RichTextEditor from '../../../../_components/_rich-text-editor'

interface Props {
  mode: 'create' | 'update'
  page?: WebPageRecord
}

export default function WebPageForm({ mode, page }: Props) {
  const isUpdate = mode === 'update'

  return (
    <form
      class="space-y-5"
      data-pjax="true"
      data-validate-trigger="blur"
      method="post"
    >
      <input name="intent" type="hidden" value={mode} />
      {isUpdate && page ? <input name="id" type="hidden" value={page.id} /> : null}
      <div class="grid gap-4 lg:grid-cols-2">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">页面标题</legend>
          <input
            class="input w-full"
            maxlength={255}
            name="title"
            placeholder="请输入页面标题"
            required
            value={page?.title ?? ''}
          />
          <p class="label">展示在页面详情和后台列表中。</p>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">页面别名</legend>
          <input
            class="input w-full font-mono"
            maxlength={255}
            name="alias"
            pattern="^[\\w.-]+$"
            placeholder="about-us"
            required
            value={page?.alias ?? ''}
          />
          <p class="label">用于生成访问路径，只允许字母、数字、点、横线和下划线。</p>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">分类</legend>
          <input
            class="input w-full"
            maxlength={80}
            name="category"
            placeholder="请输入分类"
            value={page?.category ?? ''}
          />
          <p class="label">用于前台展示和后台检索，可留空。</p>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">摘要</legend>
          <input
            class="input w-full"
            maxlength={500}
            name="summary"
            placeholder="请输入页面摘要"
            value={page?.summary ?? ''}
          />
          <p class="label">用于页面顶部简介，可留空。</p>
        </fieldset>

        <RichTextEditor
          label="页面内容"
          name="content"
          placeholder="请输入页面正文"
          uploadType="page"
          value={page?.content ?? ''}
        />
      </div>

      <div class="flex justify-end gap-2 border-t border-base-300 pt-4">
        <a class="btn btn-ghost btn-sm" data-pjax="true" href="/admin/web/page">
          取消
        </a>
        <button class="btn btn-primary btn-sm" type="submit">
          {isUpdate ? '保存页面' : '创建页面'}
        </button>
      </div>
    </form>
  )
}
