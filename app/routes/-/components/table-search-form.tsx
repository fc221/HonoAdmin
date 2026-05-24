interface Props {
  action: string
  keyword: string
  pageSize?: number
  placeholder?: string
}

export default function TableSearchForm({
  action,
  keyword,
  pageSize,
  placeholder = '关键词搜索',
}: Props) {
  return (
    <form
      action={action}
      class="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto"
      data-turbo="true"
      data-turbo-action="replace"
      data-turbo-frame="admin-list-frame"
      method="get"
    >
      {pageSize ? <input name="pageSize" type="hidden" value={pageSize} /> : null}
      <label class="input input-bordered input-sm flex w-full max-w-xs items-center gap-2 sm:w-64">
        <i class="icon-[ri--search-line] text-base-content/45"></i>
        <input
          class="grow"
          name="keyword"
          placeholder={placeholder}
          type="search"
          value={keyword}
        />
      </label>
      <button class="btn btn-primary btn-sm" type="submit">
        搜索
      </button>
    </form>
  )
}
