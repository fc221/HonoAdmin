import type { Child } from 'hono/jsx'

interface Props {
  actions?: Child
  backHref?: string
  description?: string
  title: string
}

export default function PageHeader({
  actions,
  backHref,
  description,
  title,
}: Props) {
  return (
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-4">
      <div class="flex min-w-0 flex-wrap items-center gap-3">
        {backHref
          ? (
              <a
                class="btn btn-ghost btn-sm"
                data-history-back="true"
                href={backHref}
              >
                <i class="icon-[ri--arrow-left-line]" />
                返回
              </a>
            )
          : null}
        <div class={`min-w-0 ${backHref ? 'border-l border-base-300 pl-4' : ''}`}>
          <h1 class="truncate text-lg font-semibold">{title}</h1>
          {description
            ? <p class="mt-1 text-sm text-base-content/60">{description}</p>
            : null}
        </div>
      </div>
      {actions ? <div class="shrink-0">{actions}</div> : null}
    </div>
  )
}
