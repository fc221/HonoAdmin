type QueryValue = null | number | string | undefined

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface Props {
  action: string
  pagination: PaginationState
  query?: Record<string, QueryValue>
}

export default function Pagination({ action, pagination, query = {} }: Props) {
  if (pagination.totalPages <= 1) {
    return null
  }

  const pages = getVisiblePages(pagination.page, pagination.totalPages)

  return (
    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div class="text-sm text-base-content/60">
        共
        {' '}
        {pagination.total}
        {' '}
        条，每页
        {' '}
        {pagination.pageSize}
        {' '}
        条
      </div>
      <div class="join">
        <PageLink
          action={action}
          disabled={pagination.page <= 1}
          label="上一页"
          page={pagination.page - 1}
          query={query}
        />
        {pages.map((page, index) =>
          page === 'ellipsis'
            ? (
                <button
                  class="btn btn-xs join-item btn-disabled"
                  key={`ellipsis-${index}`}
                  type="button"
                >
                  ...
                </button>
              )
            : (
                <PageLink
                  action={action}
                  active={page === pagination.page}
                  label={String(page)}
                  page={page}
                  query={query}
                  key={page}
                />
              )
        )}
        <PageLink
          action={action}
          disabled={pagination.page >= pagination.totalPages}
          label="下一页"
          page={pagination.page + 1}
          query={query}
        />
      </div>
    </div>
  )
}

function PageLink({
  action,
  active = false,
  disabled = false,
  label,
  page,
  query,
}: {
  action: string
  active?: boolean
  disabled?: boolean
  label: string
  page: number
  query: Record<string, QueryValue>
}) {
  if (disabled) {
    return (
      <button class="btn btn-xs join-item btn-disabled" type="button">
        {label}
      </button>
    )
  }

  return (
    <a
      class={`btn btn-xs join-item ${active ? 'btn-primary' : 'btn-ghost'}`}
      data-history-replace="true"
      href={createPageHref(action, query, page)}
    >
      {label}
    </a>
  )
}

function createPageHref(
  action: string,
  query: Record<string, QueryValue>,
  page: number,
): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, String(value))
    }
  }

  if (page > 1) {
    searchParams.set('page', String(page))
  }

  const queryString = searchParams.toString()
  return queryString ? `${action}?${queryString}` : action
}

function getVisiblePages(
  page: number,
  totalPages: number,
): Array<'ellipsis' | number> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const normalizedPages = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right)

  const result: Array<'ellipsis' | number> = []
  let previous = 0

  for (const current of normalizedPages) {
    if (previous && current - previous > 1) {
      result.push('ellipsis')
    }

    result.push(current)
    previous = current
  }

  return result
}
